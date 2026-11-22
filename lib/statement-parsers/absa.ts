import type { PdfLine, PdfTextItem } from "@/lib/pdf/extract-lines";
import type { StatementParser, StatementRow, StatementTotals } from "./types";
import { parseStatementAmount, parseStatementDate } from "./helpers";

// Absa transaction history statement. Layout, per page:
//   page header: reference, issue date (top right), "Statement for the Period 2024-05-01 - …"
//   column header on every page: Date | Transaction Description | Amount | Balance
//   (column positions shift slightly from page to page, so each page's header is used)
//   rows: "2024-05-01" | "POS PURCHASE … CARD" | "-R200.00" | "R7 822.73"
//         wrapped lines sit just below the row (often the card line, e.g. "NO. 1234")
//   One signed amount column: a minus means money out. Charges are their own rows
//   ("TRANSACTION CHARGE", "NOTIFICATION FEE"). R0.00 rows ("NOTIFIC FEE SMS … = 6",
//   "ADMIN FEE") are information only and are skipped; the charge lines carry the amounts.
//   "Balance Brought Forward" starts the table and "Balance Carried Forward R13.40" ends it.
//   The PDF sometimes splits a balance into touching pieces ("R22" + "411.47").

type Columns = {
    dateX: number;
    descriptionX: number;
    // Amounts are right-aligned, so they're matched by their right edge.
    amountRight: number;
    balanceRight: number;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Card numbers ("CARD NO. 1234"), sometimes split across the row and its wrapped line.
const CARD_FRAGMENT = /\s*\bCARD\s+[A-Za-z.]{1,4}\s*\d{4}\b/gi;
const FEE_PATTERN = /\b(FEES?|CHARGES?)\b/i;

const right = (item: PdfTextItem) => item.x + item.width;
const textOf = (items: PdfTextItem[]) => items.map((item) => item.text.trim()).join(" ");

// Glues pieces the PDF split apart without a gap ("R22" + "411.47" -> "R22411.47").
const joinTouching = (items: PdfTextItem[]): PdfTextItem[] => {
    const joined: PdfTextItem[] = [];

    for (const item of [...items].sort((a, b) => a.x - b.x)) {
        const previous = joined.at(-1);
        if (previous && item.x - right(previous) < 1) {
            previous.text = `${previous.text.trim()}${item.text.trim()}`;
            previous.width = right(item) - previous.x;
        } else {
            joined.push({ ...item, text: item.text.trim() });
        }
    }

    return joined;
};

const findColumns = (line: PdfLine): Columns | null => {
    const find = (label: string) => line.items.find((item) => item.text.trim().toLowerCase() === label);
    const date = find("date");
    const description = find("transaction description");
    const amount = find("amount");
    const balance = find("balance");

    if (!date || !description || !amount || !balance) return null;

    return {
        dateX: date.x,
        descriptionX: description.x,
        amountRight: right(amount),
        balanceRight: right(balance),
    };
};

type ParsedRow = StatementRow & { rawPayee: string; impossibleDate?: string };

// "2024-06-31" can't be a real date, but the row is still a real transaction. Rather than drop
// it (and its money), it's dated the last day of that month and flagged in the preview.
const parseAbsaDate = (text: string): { date: Date; impossible: boolean } | null => {
    const valid = parseStatementDate(text);
    if (valid) return { date: valid, impossible: false };

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const lastDay = new Date(year, month, 0).getDate();
    return { date: new Date(year, month - 1, Math.min(day, lastDay)), impossible: true };
};

const parseLines = (lines: PdfLine[]) => {
    const rows: ParsedRow[] = [];
    const totals: StatementTotals = {};
    let ended = false;

    for (const page of [...new Set(lines.map((line) => line.page))]) {
        if (ended) break;

        const pageLines = lines.filter((line) => line.page === page);
        const headerLine = pageLines.find((line) => findColumns(line));
        // Every page repeats the header; a page without one has no transactions.
        if (!headerLine) continue;
        const columns = findColumns(headerLine)!;

        let current: ParsedRow | null = null;
        let currentY = 0;

        for (const line of pageLines) {
            // Page header block, account details and the column header itself.
            if (line.y >= headerLine.y) continue;

            const items = joinTouching(line.items);
            const text = textOf(items);

            const amountOf = (column: "amount" | "balance") => {
                const edge = column === "amount" ? columns.amountRight : columns.balanceRight;
                const item = items.find((candidate) =>
                    Math.abs(right(candidate) - edge) <= 20 && parseStatementAmount(candidate.text) !== null);
                return item ? parseStatementAmount(item.text) : null;
            };

            if (/^Balance Brought Forward/i.test(text)) {
                const opening = amountOf("balance") ?? amountOf("amount");
                if (opening !== null) totals.openingBalance = opening;
                current = null;
                continue;
            }

            if (/^Balance Carried Forward/i.test(text)) {
                const closing = amountOf("balance") ?? amountOf("amount");
                if (closing !== null) totals.closingBalance = closing;
                ended = true;
                break;
            }

            const dateItem = items.find((item) => Math.abs(item.x - columns.dateX) < 10 && DATE_PATTERN.test(item.text));
            const amount = amountOf("amount");
            const balance = amountOf("balance");
            const description = items
              .filter((item) => item !== dateItem && item.x >= columns.descriptionX - 5 && right(item) < columns.amountRight - 45)
              .map((item) => item.text)
              .filter(Boolean)
              .join(" ");

            if (dateItem) {
                const parsedDate = parseAbsaDate(dateItem.text);

                // R0.00 rows are information only (SMS counts, zero admin fees): skipped, and
                // their wrapped lines aren't attached to the previous transaction.
                if (!parsedDate || amount === null || amount === 0 || !description) {
                    current = null;
                    continue;
                }

                current = {
                    date: parsedDate.date,
                    impossibleDate: parsedDate.impossible ? dateItem.text : undefined,
                    payee: "",
                    rawPayee: description,
                    // Signed as printed: a minus means money out.
                    amount,
                    balance: balance ?? undefined,
                    notes: FEE_PATTERN.test(description) ? "Fee" : undefined,
                };
                currentY = line.y;
                rows.push(current);
                continue;
            }

            // A wrapped description line sits just below its row (rows are ~13pt apart).
            // Footers (issue date and page number) start left of the description column.
            if (current && description && amount === null && balance === null
                && items[0].x >= columns.descriptionX - 5 && currentY - line.y <= 14) {
                current.rawPayee = `${current.rawPayee} ${description}`;
                currentY = line.y;
            } else {
                current = null;
            }
        }
    }

    // Card numbers are dropped from descriptions once wrapped lines are joined, because
    // "CARD" and its number are often split across two lines.
    for (const row of rows) {
        row.payee = row.rawPayee.replace(CARD_FRAGMENT, "").replace(/\s+/g, " ").trim() || row.rawPayee;
    }

    return { rows, totals };
};

export const absaParser: StatementParser = {
    id: "absa",
    name: "Absa",
    // Needs "ABSA" on the statement AND Absa's own column header (Date, "Transaction
    // Description", Amount, Balance). The other banks' headers all differ, so none can match
    // another's statement, even if a description mentions a payment to Absa.
    detect: (lines) =>
        lines.some((line) => /\bABSA\b/i.test(textOf(line.items)))
        && lines.some((line) => findColumns(line) !== null),
    parse: (lines) => parseLines(lines).rows.map(({ rawPayee, impossibleDate, ...row }) => {
        void rawPayee;
        void impossibleDate;
        return row;
    }),
    getTotals: (lines) => parseLines(lines).totals,
    getWarnings: (lines) => {
        const impossible = parseLines(lines).rows.filter((row) => row.impossibleDate);
        if (impossible.length === 0) return [];

        const printed = [...new Set(impossible.map((row) => row.impossibleDate))].join(", ");
        return [
            `${impossible.length} ${impossible.length === 1 ? "row has" : "rows have"} a date that doesn't exist (${printed}), ` +
            "so they're dated the last day of that month.",
        ];
    },
};

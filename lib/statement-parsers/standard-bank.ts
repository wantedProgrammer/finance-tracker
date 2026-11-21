import type { PdfLine, PdfTextItem } from "@/lib/pdf/extract-lines";
import type { StatementParser, StatementRow, StatementTotals } from "./types";
import { parseStatementAmount, resolveYear } from "./helpers";

// Standard Bank (SBSA) account statement. Layout, per page:
//   header block (contact details, "STANDARD BANK", "From: 14 May 26", "To: 12 Aug 26")
//   column header: Date | Description | Payments | Deposits | Balance
//   rows: "15 May 26" | "FOOD ZONE 5196*1931 13 MAY" | "-37.00" | | "2.19"
//         followed by one or more description lines ("DEBIT CARD PURCHASE FROM")
//   footer: "The Standard Bank of South Africa Limited ... Page 1 of 12"
// The last page has a "Statement Summary" with total payments and deposits.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE_PATTERN = /^(\d{1,2}) ([A-Za-z]{3})(?: (\d{2}|\d{4}))?$/;

type Columns = {
    dateX: number;
    descriptionX: number;
    // Amounts are right-aligned, so columns are matched by their right edge.
    paymentsRight: number;
    depositsRight: number;
    balanceRight: number;
};

const right = (item: PdfTextItem) => item.x + item.width;
const textOf = (line: PdfLine) => line.items.map((item) => item.text.trim()).join(" ");

const findColumnHeader = (line: PdfLine): Columns | null => {
    const find = (label: string) => line.items.find((item) => item.text.trim().toLowerCase() === label);
    const date = find("date");
    const description = find("description");
    const payments = find("payments");
    const deposits = find("deposits");
    const balance = find("balance");

    if (!date || !description || !payments || !deposits || !balance) return null;

    return {
        dateX: date.x,
        descriptionX: description.x,
        paymentsRight: right(payments),
        depositsRight: right(deposits),
        balanceRight: right(balance),
    };
};

const parseShortDate = (text: string): { day: number; month: number; year?: number } | null => {
    const match = text.trim().match(DATE_PATTERN);
    if (!match) return null;

    const month = MONTHS.indexOf(match[2].toLowerCase()) + 1;
    if (month === 0) return null;

    const yearText = match[3];
    const year = yearText ? (yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText)) : undefined;

    return { day: Number(match[1]), month, year };
};

// "From: 14 May 26" / "To: 12 Aug 26" in the page header.
const findPeriod = (lines: PdfLine[]) => {
    const find = (label: string) => {
        for (const line of lines) {
            const match = textOf(line).match(new RegExp(`${label}:\\s*(\\d{1,2} [A-Za-z]{3} \\d{2,4})`, "i"));
            const date = match && parseShortDate(match[1]);
            if (date?.year) return new Date(date.year, date.month - 1, date.day);
        }
        return null;
    };

    const from = find("From");
    const to = find("To");
    return from && to ? { from, to } : null;
};

// Which amount column an item belongs to, by the nearest right edge.
const amountColumn = (item: PdfTextItem, columns: Columns) => {
    const candidates = [
        { name: "payments" as const, distance: Math.abs(right(item) - columns.paymentsRight) },
        { name: "deposits" as const, distance: Math.abs(right(item) - columns.depositsRight) },
        { name: "balance" as const, distance: Math.abs(right(item) - columns.balanceRight) },
    ].sort((a, b) => a.distance - b.distance);

    // Further than this from every column: not an amount in the table.
    return candidates[0].distance <= 30 ? candidates[0].name : null;
};

const isFooter = (line: PdfLine, columns: Columns) => {
    const text = textOf(line);
    return /^The Standard Bank of South Africa/i.test(text)
        || /\bPage \d+ of \d+\b/i.test(text)
        // Notices and legal text start left of the description column.
        || line.items[0].x < columns.descriptionX - 40;
};

const parseLines = (lines: PdfLine[]) => {
    const columns = lines.map(findColumnHeader).find(Boolean) ?? null;
    if (!columns) return { rows: [] as StatementRow[], totals: {} as StatementTotals };

    const period = findPeriod(lines);
    const rows: StatementRow[] = [];
    const totals: StatementTotals = {};

    let current: StatementRow | null = null;
    let inSummary = false;

    const pages = [...new Set(lines.map((line) => line.page))];

    for (const page of pages) {
        const pageLines = lines.filter((line) => line.page === page);
        const headerLine = pageLines.find((line) => findColumnHeader(line));
        // A transaction's description never continues onto the next page.
        current = null;

        for (const line of pageLines) {
            const text = textOf(line);

            if (/^Statement Summary/i.test(text)) {
                inSummary = true;
                continue;
            }

            if (inSummary) {
                // "Payments -R10,308.10" / "Deposits R10,302.15"
                const amount = parseStatementAmount(line.items.at(-1)?.text ?? "");
                if (amount !== null && /^Payments\b/i.test(text)) totals.moneyOut = amount;
                if (amount !== null && /^Deposits\b/i.test(text)) totals.moneyIn = amount;
                continue;
            }

            // Skip the page header block and pages without a transaction table.
            if (!headerLine || line.y >= headerLine.y) continue;

            const dateItem = line.items.find((item) => Math.abs(item.x - columns.dateX) < 15 && parseShortDate(item.text));

            // Transaction lines also start at the left (with the date), so only non-dated
            // lines can be footers or notices.
            if (!dateItem && isFooter(line, columns)) {
                current = null;
                continue;
            }
            const amounts: Partial<Record<"payments" | "deposits" | "balance", number>> = {};
            const descriptionParts: string[] = [];

            for (const item of line.items) {
                if (item === dateItem) continue;

                const value = parseStatementAmount(item.text);
                const column = value !== null ? amountColumn(item, columns) : null;

                if (value !== null && column) {
                    amounts[column] = value;
                } else if (item.x >= columns.descriptionX - 5) {
                    descriptionParts.push(item.text.trim());
                }
            }

            const description = descriptionParts.filter(Boolean).join(" ");

            if (/OPENING BALANCE/i.test(description)) {
                if (amounts.balance !== undefined) totals.openingBalance = amounts.balance;
                current = null;
                continue;
            }

            if (/CLOSING BALANCE|BROUGHT FORWARD|CARRIED FORWARD/i.test(description)) {
                current = null;
                continue;
            }

            if (dateItem) {
                const date = parseShortDate(dateItem.text)!;
                const year = date.year ?? (period ? resolveYear(date.month, period) : new Date().getFullYear());

                // Payments are money out, deposits money in, whatever sign is printed.
                const amount = amounts.payments !== undefined
                    ? -Math.abs(amounts.payments)
                    : amounts.deposits !== undefined
                        ? Math.abs(amounts.deposits)
                        : null;

                if (amount === null || !description) {
                    current = null;
                    continue;
                }

                current = {
                    date: new Date(year, date.month - 1, date.day),
                    payee: description,
                    amount,
                    balance: amounts.balance,
                };
                rows.push(current);
                continue;
            }

            // A line with only description text continues the transaction above.
            if (current && description && Object.keys(amounts).length === 0) {
                current.notes = current.notes ? `${current.notes} ${description}` : description;
            }
        }
    }

    return { rows, totals };
};

export const standardBankParser: StatementParser = {
    id: "standard-bank",
    name: "Standard Bank",
    detect: (lines) => {
        const hasBankName = lines.some((line) => /^STANDARD BANK$/i.test(textOf(line))
            || /^The Standard Bank of South Africa/i.test(textOf(line)));
        const hasColumns = lines.some((line) => findColumnHeader(line) !== null);
        return hasBankName && hasColumns;
    },
    parse: (lines) => parseLines(lines).rows,
    getTotals: (lines) => parseLines(lines).totals,
};

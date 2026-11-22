import type { PdfLine, PdfTextItem } from "@/lib/pdf/extract-lines";
import type { StatementParser, StatementRow } from "./types";
import { parseStatementAmount, parseStatementDate } from "./helpers";

// Capitec Bank account statement. Layout:
//   page 1: account details, "From Date: 10/01/2020", "To Date: 09/02/2020"
//   column header (page 1 only): Posting Date | Transaction Date | Description |
//                                Money In (R) | Money Out (R) | Balance (R)
//   rows: "11/01/2020" | "11/01/2020" | "ATM Cash Withdrawal …" | | "500.00" | "9 394.22"
//         wrapped description lines sit BELOW the row ("(Card 1234)", references)
//   Fees are their own rows, e.g. "*SMS Notification Fee". "*" marks amounts that include
//   VAT, which also covers prepaid purchases, so it doesn't on its own mean "fee".
//   After the table: a "Transactions … processed … up to <date>" section with pending
//   transactions (skipped: they appear on the next statement), then "Available Balance".
//   The PDF splits numbers and dates into pieces ("1" + "394.22", "5" + ".50",
//   "23/01/202" + "0"), so pieces are joined before reading each line.

type Columns = {
    postingX: number;
    transactionX: number;
    descriptionX: number;
    // Left edge of the money columns: anything starting here isn't description text.
    moneyLeft: number;
    // Amounts are right-aligned, so they're matched by their right edge.
    moneyInRight: number;
    moneyOutRight: number;
    balanceRight: number;
};

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const NUMERIC_PIECE = /^[\d.,]+$/;

const right = (item: PdfTextItem) => item.x + item.width;

// Rejoins pieces the PDF split apart: pieces that touch are glued together, and digit groups
// a space apart are joined with a space (thousands, e.g. "1" + "394.22" -> "1 394.22").
const joinPieces = (items: PdfTextItem[]): PdfTextItem[] => {
    const joined: PdfTextItem[] = [];

    for (const item of [...items].sort((a, b) => a.x - b.x)) {
        const previous = joined.at(-1);
        const gap = previous ? item.x - right(previous) : Infinity;
        const text = item.text.trim();

        if (previous && gap < 1) {
            previous.text = `${previous.text.trim()}${text}`;
            previous.width = right(item) - previous.x;
        } else if (previous && gap < 4.5 && NUMERIC_PIECE.test(previous.text.trim()) && NUMERIC_PIECE.test(text)) {
            previous.text = `${previous.text.trim()} ${text}`;
            previous.width = right(item) - previous.x;
        } else {
            joined.push({ ...item, text });
        }
    }

    return joined;
};

const textOf = (items: PdfTextItem[]) => items.map((item) => item.text.trim()).join(" ");

const findColumns = (line: PdfLine): Columns | null => {
    const find = (pattern: RegExp) => line.items.find((item) => pattern.test(item.text.trim()));
    const posting = find(/^posting date$/i);
    const transaction = find(/^transaction/i);
    const description = find(/^description$/i);
    const moneyIn = find(/^money in/i);
    const moneyOut = find(/^money out/i);
    const balance = find(/^balance/i);

    if (!posting || !transaction || !description || !moneyIn || !moneyOut || !balance) return null;

    return {
        postingX: posting.x,
        transactionX: transaction.x,
        descriptionX: description.x,
        moneyLeft: moneyIn.x,
        moneyInRight: right(moneyIn),
        moneyOutRight: right(moneyOut),
        balanceRight: right(balance),
    };
};

const formatDay = (date: Date) =>
    [String(date.getDate()).padStart(2, "0"), String(date.getMonth() + 1).padStart(2, "0"), date.getFullYear()].join("/");

const parseLines = (lines: PdfLine[]): StatementRow[] => {
    let columns: Columns | null = null;
    const rows: StatementRow[] = [];
    let current: StatementRow | null = null;
    let ended = false;

    for (const page of [...new Set(lines.map((line) => line.page))]) {
        if (ended) break;

        const pageLines = lines.filter((line) => line.page === page);
        const headerLine = pageLines.find((line) => findColumns(line));
        if (headerLine) columns = findColumns(headerLine);
        // No table yet (account details only).
        if (!columns) continue;

        // A wrapped description never continues onto the next page.
        current = null;

        for (const line of pageLines) {
            // Page 1's account details and column header (its "Date" second line included).
            if (headerLine && line.y >= headerLine.y - 12) continue;

            const items = joinPieces(line.items);
            const text = textOf(items);

            // Pending transactions and the available balance follow the table: stop there.
            if (/^Transactions\b/i.test(text) || /^Available Balance/i.test(text)) {
                ended = true;
                break;
            }

            const postingItem = items.find((item) => Math.abs(item.x - columns!.postingX) < 12 && DATE_PATTERN.test(item.text));
            const transactionItem = items.find((item) => item !== postingItem && Math.abs(item.x - columns!.transactionX) < 12 && DATE_PATTERN.test(item.text));

            // Footers: page numbers, and legal text that starts left of the description column
            // or sits in the money columns.
            if (!postingItem && (
                /^Page \d+ of \d+$/i.test(text)
                || items[0].x < columns.descriptionX - 40
                || items[0].x >= columns.moneyLeft - 5
            )) {
                current = null;
                continue;
            }

            let moneyIn: number | null = null;
            let moneyOut: number | null = null;
            let balance: number | undefined;
            const description: string[] = [];

            for (const item of items) {
                if (item === postingItem || item === transactionItem) continue;

                const value = parseStatementAmount(item.text);
                if (value !== null && item.x >= columns.moneyLeft - 40) {
                    const distances = [
                        { name: "in", distance: Math.abs(right(item) - columns.moneyInRight) },
                        { name: "out", distance: Math.abs(right(item) - columns.moneyOutRight) },
                        { name: "balance", distance: Math.abs(right(item) - columns.balanceRight) },
                    ].sort((a, b) => a.distance - b.distance);

                    if (distances[0].distance <= 20) {
                        if (distances[0].name === "in") moneyIn = value;
                        else if (distances[0].name === "out") moneyOut = value;
                        else balance = value;
                        continue;
                    }
                }

                if (item.x >= columns.descriptionX - 5) {
                    description.push(item.text);
                }
            }

            const descriptionText = description.filter(Boolean).join(" ");

            if (postingItem) {
                const postingDate = parseStatementDate(postingItem.text);
                const transactionDate = transactionItem ? parseStatementDate(transactionItem.text) : null;
                const amount = moneyIn !== null ? Math.abs(moneyIn) : moneyOut !== null ? -Math.abs(moneyOut) : null;

                if (!postingDate || amount === null || !descriptionText) {
                    current = null;
                    continue;
                }

                // "*" means the amount includes VAT. Fees have it, but so do prepaid purchases
                // (airtime, electricity), so only rows that say "Fee" are fees.
                const includesVat = descriptionText.startsWith("*");
                const isFee = /\bfees?\b/i.test(descriptionText);
                const date = transactionDate ?? postingDate;
                const notes = [
                    isFee ? (includesVat ? "Fee (incl. VAT)" : "Fee") : includesVat ? "Incl. VAT" : null,
                    date.getTime() !== postingDate.getTime() ? `Posted ${formatDay(postingDate)}` : null,
                ].filter(Boolean).join(" · ");

                current = {
                    date,
                    payee: descriptionText.replace(/^\*\s*/, ""),
                    amount,
                    balance,
                    notes: notes || undefined,
                };
                rows.push(current);
                continue;
            }

            // A line with only description text continues the description above it.
            if (current && descriptionText && moneyIn === null && moneyOut === null && balance === undefined) {
                current.payee = `${current.payee} ${descriptionText}`;
            }
        }
    }

    return rows;
};

export const capitecParser: StatementParser = {
    id: "capitec",
    name: "Capitec",
    // Needs "Capitec Bank" on the statement AND its own column layout (Posting Date,
    // Money In, Money Out). Standard Bank needs Payments/Deposits columns and Mukuru a Type
    // column, so none of them can match another's statement.
    detect: (lines) =>
        lines.some((line) => /\bCapitec Bank\b/i.test(textOf(line.items)))
        && lines.some((line) => findColumns(line) !== null),
    parse: parseLines,
};

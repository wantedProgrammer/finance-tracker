import type { PdfLine, PdfTextItem } from "@/lib/pdf/extract-lines";
import type { StatementParser, StatementRow, StatementTotals } from "./types";
import { findStatementPeriod, parseStatementAmount, parseStatementDate } from "./helpers";

// Fallback for banks without their own parser. It looks for a transaction table by its column
// headings and reads rows from it. Because it hasn't been checked against each bank's real
// statements, imports are only allowed when the running balance or totals prove the rows add
// up (see the preview), or after the user confirms they've checked them.

type ColumnName = "debit" | "credit" | "amount" | "balance";

type Columns = {
    dateX: number;
    descriptionX: number;
    // Amount columns are right-aligned, so they're matched by their right edge.
    amounts: { name: ColumnName; right: number }[];
};

const HEADINGS: { name: "date" | "description" | ColumnName; pattern: RegExp }[] = [
    { name: "balance", pattern: /balance/i },
    { name: "debit", pattern: /debit|payments?|withdrawals?|money out|paid out/i },
    { name: "credit", pattern: /credit|deposits?|money in|paid in|receipts?/i },
    { name: "amount", pattern: /amount/i },
    { name: "date", pattern: /\bdate\b/i },
    { name: "description", pattern: /description|details|transaction|narrative|particulars|reference/i },
];

const right = (item: PdfTextItem) => item.x + item.width;
const textOf = (line: PdfLine) => line.items.map((item) => item.text.trim()).join(" ");

const findColumns = (line: PdfLine): Columns | null => {
    const found = new Map<string, PdfTextItem>();

    for (const item of line.items) {
        const heading = HEADINGS.find((candidate) => candidate.pattern.test(item.text));
        if (heading && !found.has(heading.name)) found.set(heading.name, item);
    }

    const date = found.get("date");
    const description = found.get("description");
    const amounts = (["debit", "credit", "amount", "balance"] as const)
      .filter((name) => found.has(name))
      .map((name) => ({ name, right: right(found.get(name)!) }));

    const hasMoneyColumn = amounts.some((column) => column.name !== "balance");
    if (!date || !description || !hasMoneyColumn || description.x <= date.x) return null;

    return { dateX: date.x, descriptionX: description.x, amounts };
};

const nearestColumn = (item: PdfTextItem, columns: Columns) => {
    const nearest = columns.amounts
      .map((column) => ({ name: column.name, distance: Math.abs(right(item) - column.right) }))
      .sort((a, b) => a.distance - b.distance)[0];

    return nearest && nearest.distance <= 35 ? nearest.name : null;
};

const hasExplicitSign = (text: string) => /-|\b(CR|DR)\b|(CR|DR)$/i.test(text.trim());

const isFooter = (line: PdfLine, columns: Columns) =>
    /\bpage \d+ (of|\/) \d+\b/i.test(textOf(line)) || line.items[0].x < columns.descriptionX - 40;

type ParsedRow = StatementRow & { signKnown: boolean };

const parseLines = (lines: PdfLine[]) => {
    const rows: ParsedRow[] = [];
    const totals: StatementTotals = {};
    const period = findStatementPeriod(lines.map(textOf));

    let columns: Columns | null = null;
    let current: ParsedRow | null = null;
    let ended = false;

    for (const page of [...new Set(lines.map((line) => line.page))]) {
        const pageLines = lines.filter((line) => line.page === page);
        const headerLine = pageLines.find((line) => findColumns(line));
        if (headerLine) columns = findColumns(headerLine);
        if (!columns || ended) continue;

        // Descriptions don't continue across pages; page headers are ignored until a dated row.
        current = null;

        for (const line of pageLines) {
            if (headerLine && line.y >= headerLine.y) continue;

            const text = textOf(line);
            if (/^(statement summary|summary of|account summary)/i.test(text)) {
                ended = true;
                break;
            }

            // The date can be split into several text items ("15", "May", "26").
            const dateItems = line.items.filter((item) => item.x < columns!.descriptionX - 3);
            const date = dateItems.length ? parseStatementDate(dateItems.map((item) => item.text).join(" "), period) : null;

            if (!date && isFooter(line, columns)) {
                current = null;
                continue;
            }

            const values: Partial<Record<ColumnName, { value: number; explicit: boolean }>> = {};
            const description: string[] = [];
            let lastAmountColumn: ColumnName | null = null;

            for (const item of line.items) {
                if (date && dateItems.includes(item)) continue;
                const itemText = item.text.trim();

                // A separate "Cr"/"Dr" next to an amount belongs to that amount.
                if (/^(CR|DR)$/i.test(itemText) && lastAmountColumn && values[lastAmountColumn]) {
                    const entry = values[lastAmountColumn]!;
                    entry.value = /^DR$/i.test(itemText) ? -Math.abs(entry.value) : Math.abs(entry.value);
                    entry.explicit = true;
                    continue;
                }

                const value = parseStatementAmount(itemText);
                const column = value !== null ? nearestColumn(item, columns) : null;

                if (value !== null && column) {
                    values[column] = { value, explicit: hasExplicitSign(itemText) };
                    lastAmountColumn = column;
                } else if (item.x >= columns.descriptionX - 5) {
                    description.push(itemText);
                    lastAmountColumn = null;
                }
            }

            const descriptionText = description.filter(Boolean).join(" ");

            if (/opening balance|balance brought forward|brought forward/i.test(descriptionText || text)) {
                const balance = values.balance?.value ?? values.amount?.value;
                if (balance !== undefined) totals.openingBalance = balance;
                current = null;
                continue;
            }

            if (/closing balance|carried forward|^total/i.test(descriptionText || text)) {
                current = null;
                continue;
            }

            if (date) {
                let amount: number | null = null;
                let signKnown = true;

                if (values.debit) {
                    amount = -Math.abs(values.debit.value);
                } else if (values.credit) {
                    amount = Math.abs(values.credit.value);
                } else if (values.amount) {
                    amount = values.amount.value;
                    signKnown = values.amount.explicit;
                }

                if (amount === null || !descriptionText) {
                    current = null;
                    continue;
                }

                current = {
                    date,
                    payee: descriptionText,
                    amount,
                    balance: values.balance?.value,
                    signKnown,
                };
                rows.push(current);
                continue;
            }

            if (current && descriptionText && Object.keys(values).length === 0) {
                current.notes = current.notes ? `${current.notes} ${descriptionText}` : descriptionText;
            }
        }
    }

    // A single unsigned "Amount" column: work out the sign from how the balance moved.
    let previous = totals.openingBalance;
    for (const row of rows) {
        if (!row.signKnown && previous !== undefined && row.balance !== undefined) {
            const moved = Math.round((row.balance - previous) * 100);
            if (moved === Math.round(Math.abs(row.amount) * 100)) {
                row.amount = Math.abs(row.amount);
                row.signKnown = true;
            } else if (moved === -Math.round(Math.abs(row.amount) * 100)) {
                row.amount = -Math.abs(row.amount);
                row.signKnown = true;
            }
        }
        previous = row.balance ?? undefined;
    }

    return { rows, totals };
};

export const genericParser: StatementParser = {
    id: "generic",
    name: "Other bank (unverified)",
    generic: true,
    detect: (lines) => lines.some((line) => findColumns(line) !== null),
    parse: (lines) => parseLines(lines).rows.map(({ signKnown, ...row }) => {
        void signKnown;
        return row;
    }),
    getTotals: (lines) => parseLines(lines).totals,
    getWarnings: (lines) => {
        const unsure = parseLines(lines).rows.filter((row) => !row.signKnown).length;
        return unsure
            ? [`Couldn't tell whether ${unsure} ${unsure === 1 ? "amount is" : "amounts are"} money in or out.`]
            : [];
    },
};

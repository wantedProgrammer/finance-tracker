import type { PdfLine, PdfTextItem } from "@/lib/pdf/extract-lines";
import type { StatementParser, StatementRow, StatementTotals } from "./types";
import { findStatementPeriod, parseStatementAmount, parseStatementDate } from "./helpers";

// FNB (First National Bank) account statement. Layout:
//   page 1: account details, a summary box ("Opening Balance 3,400.00 Cr", "Closing Balance …",
//           bank charges), and "Statement Period : 1 July 2023 to 1 August 2023"
//   column header on every page: Date | Description | Amount | Balance | Accrued Bank Charges
//   rows: "04 Jul" | "POS Purchase …" | [reference, no heading] | "206.69" | "3,193.31" "Cr"
//   Money in has "Cr" after the amount; money out has no marker. Balances have "Cr" when in
//   credit and no marker (or "Dr") when overdrawn. Fee lines start with "#".
//   The Accrued Bank Charges column only previews fees that are charged later as their own
//   "#… Fees" lines, so it's ignored: counting it would charge those fees twice.
//   The table ends with "Closing Balance", followed by "Credit/Debit Transactions" totals.

type Columns = {
    // Descriptions sit at the far left, not under their (centred) heading; anything starting
    // after this point and before the amounts is the unlabelled reference column.
    referenceX: number;
    // Amounts are right-aligned, so they're matched by their right edge.
    amountRight: number;
    balanceRight: number;
    accruedRight: number;
};

type ColumnName = "amount" | "balance" | "accrued";

const DATE_PATTERN = /^\d{1,2} [A-Za-z]{3}$/;
// Masked card numbers in the reference column ("123456*1234 04 Jul"): never copied.
const CARD_REFERENCE = /\d+\*\d+/;

const right = (item: PdfTextItem) => item.x + item.width;
const textOf = (line: PdfLine) => line.items.map((item) => item.text.trim()).join(" ");

const findColumns = (line: PdfLine): Columns | null => {
    const find = (label: string) => line.items.find((item) => item.text.trim().toLowerCase() === label);
    const date = find("date");
    const description = find("description");
    const amount = find("amount");
    const balance = find("balance");
    // "Accrued Bank Charges" is stacked over three lines; "Bank" is the part on the header line.
    const bank = find("bank");

    if (!date || !description || !amount || !balance || !bank) return null;

    return {
        referenceX: right(description) + 40,
        amountRight: right(amount),
        balanceRight: right(balance),
        accruedRight: right(bank),
    };
};

// Summary figures carry their own marker: "3,400.00 Cr" is in credit, "Dr" (or none) overdrawn.
const signedBalance = (text: string) => {
    const value = parseStatementAmount(text);
    if (value === null) return null;
    return /cr\s*$/i.test(text.trim()) ? Math.abs(value) : -Math.abs(value);
};

const findSummary = (lines: PdfLine[]): StatementTotals => {
    const totals: StatementTotals = {};

    // The first amount after a label on the same line ("Opening Balance" "3,400.00 Cr" …).
    const amountAfter = (line: PdfLine, label: RegExp) => {
        const index = line.items.findIndex((item) => label.test(item.text.trim()));
        if (index === -1) return null;
        const item = line.items.slice(index + 1).find((candidate) => parseStatementAmount(candidate.text) !== null);
        return item ? item.text : null;
    };

    for (const line of lines) {
        const opening = amountAfter(line, /^Opening Balance$/i);
        if (opening && totals.openingBalance === undefined) totals.openingBalance = signedBalance(opening) ?? undefined;

        const closing = amountAfter(line, /^Closing Balance$/i);
        if (closing && totals.closingBalance === undefined) totals.closingBalance = signedBalance(closing) ?? undefined;

        const text = textOf(line);
        const total = line.items.map((item) => parseStatementAmount(item.text)).find((value) => value !== null);
        if (total !== undefined && total !== null) {
            if (/Credit Transactions/i.test(text)) totals.moneyIn = Math.abs(total);
            if (/Debit Transactions/i.test(text)) totals.moneyOut = -Math.abs(total);
        }
    }

    return totals;
};

const parseLines = (lines: PdfLine[]): StatementRow[] => {
    const period = findStatementPeriod(lines.map(textOf));
    const rows: StatementRow[] = [];

    let columns: Columns | null = null;
    let ended = false;

    for (const page of [...new Set(lines.map((line) => line.page))]) {
        if (ended) break;

        const pageLines = lines.filter((line) => line.page === page);
        const headerLine = pageLines.find((line) => findColumns(line));
        if (headerLine) columns = findColumns(headerLine);
        if (!columns || !headerLine) continue;

        let current: StatementRow | null = null;
        let currentY = 0;

        for (const line of pageLines) {
            // The summary box, the header and its stacked "Accrued"/"Charges" lines.
            if (line.y >= headerLine.y - 12) continue;

            const text = textOf(line);

            if (/^Closing Balance/i.test(text)) {
                ended = true;
                break;
            }

            const dateItem = line.items.find((item) => item.x < 36 && DATE_PATTERN.test(item.text.trim()));
            const values: Partial<Record<ColumnName, { value: number; credit: boolean }>> = {};
            const description: string[] = [];
            const references: string[] = [];
            let lastColumn: ColumnName | null = null;

            for (const item of line.items) {
                if (item === dateItem) continue;
                const itemText = item.text.trim();

                // A separate "Cr"/"Dr" belongs to the amount just before it.
                if (/^(CR|DR)$/i.test(itemText) && lastColumn && values[lastColumn]) {
                    values[lastColumn]!.credit = /^CR$/i.test(itemText);
                    continue;
                }

                const value = parseStatementAmount(itemText);
                if (value !== null && item.x >= columns.referenceX - 40) {
                    const nearest = ([
                        ["amount", columns.amountRight],
                        ["balance", columns.balanceRight],
                        ["accrued", columns.accruedRight],
                    ] as const)
                      .map(([name, edge]) => ({ name, distance: Math.abs(right(item) - edge) }))
                      .sort((a, b) => a.distance - b.distance)[0];

                    if (nearest.distance <= 20) {
                        values[nearest.name] = { value, credit: /cr\s*$/i.test(itemText) };
                        lastColumn = nearest.name;
                        continue;
                    }
                }

                lastColumn = null;
                if (item.x >= columns.referenceX) {
                    references.push(itemText);
                } else if (item.x >= 36) {
                    description.push(itemText);
                }
            }

            const descriptionText = description.filter(Boolean).join(" ");

            if (dateItem && values.amount && descriptionText) {
                const date = parseStatementDate(dateItem.text, period);
                if (!date) continue;

                // Money in has "Cr"; money out has no marker. The sign comes only from the amount
                // column, never from the description (which can itself contain "Dr" or "Cr").
                const amount = values.amount.credit ? Math.abs(values.amount.value) : -Math.abs(values.amount.value);
                // Balances: "Cr" in credit; "Dr" or no marker overdrawn.
                const balance = values.balance
                    ? (values.balance.credit ? Math.abs(values.balance.value) : -Math.abs(values.balance.value))
                    : undefined;
                // Option A: values.accrued (Accrued Bank Charges) is deliberately not used.

                const isFee = descriptionText.startsWith("#");
                // Payment references can be useful; card numbers and bare numbers are dropped.
                const reference = references
                  .filter((ref) => ref && !CARD_REFERENCE.test(ref) && /[A-Za-z]/.test(ref))
                  .join(" ");
                const notes = [isFee ? "Fee" : null, reference || null].filter(Boolean).join(" · ");

                current = {
                    date,
                    payee: descriptionText.replace(/^#\s*/, ""),
                    amount,
                    balance,
                    notes: notes || undefined,
                };
                currentY = line.y;
                rows.push(current);
                continue;
            }

            // A wrapped description line sits just below its row (rows are ~10pt apart), with
            // only description text. Footers further down the page are never attached.
            if (current && descriptionText && !dateItem && Object.keys(values).length === 0 && currentY - line.y <= 14) {
                current.payee = `${current.payee} ${descriptionText}`;
                currentY = line.y;
            } else if (!dateItem) {
                current = null;
            }
        }
    }

    return rows;
};

export const fnbParser: StatementParser = {
    id: "fnb",
    name: "FNB",
    // Needs "First National Bank"/"FNB" AND FNB's own column header (Date, Description, Amount,
    // Balance with "Accrued Bank Charges"). Standard Bank (Payments/Deposits), Mukuru (Type) and
    // Capitec (Posting Date, Money In/Out) headers all differ, so none can match another's.
    detect: (lines) =>
        lines.some((line) => /First National Bank|\bFNB\b/i.test(textOf(line)))
        && lines.some((line) => findColumns(line) !== null),
    parse: parseLines,
    getTotals: findSummary,
};

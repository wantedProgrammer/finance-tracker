import type { PdfLine, PdfTextItem } from "@/lib/pdf/extract-lines";
import type { StatementParser, StatementRow, StatementTotals } from "./types";
import { findStatementPeriod, parseStatementAmount, parseStatementDate } from "./helpers";

// Mukuru card statement. Layout, per page:
//   page 1: "Statement For", card and account details, "Dates: 25 August 2026 to 21 November 2026"
//   column header on every page: Date | Description | Type | Amount | Balance
//   rows: "25 Aug" | "Card … Fee" | "Deduction" | "5.00" | "634.42"
//   Rows are vertically centred, so a wrapped description line sits just ABOVE its dated row.
//   Amounts have no sign: the Type says the direction (Load = money in; Deduction and
//   Authorisation = money out). Fees are their own rows with their own balance.
//   The table ends with "… available balance: 6.46"; the last page is a legal notice.

type Columns = {
    // Dates and amounts are right-aligned, so they're matched by their right edge.
    dateRight: number;
    descriptionX: number;
    typeX: number;
    amountRight: number;
    balanceRight: number;
};

type Direction = "in" | "out";

const TYPE_DIRECTIONS: Record<string, Direction> = {
    load: "in",
    deduction: "out",
    authorisation: "out",
    authorization: "out",
};

const right = (item: PdfTextItem) => item.x + item.width;
const textOf = (line: PdfLine) => line.items.map((item) => item.text.trim()).join(" ");

const findColumns = (line: PdfLine): Columns | null => {
    const find = (label: string) => line.items.find((item) => item.text.trim().toLowerCase() === label);
    const date = find("date");
    const description = find("description");
    const type = find("type");
    const amount = find("amount");
    const balance = find("balance");

    if (!date || !description || !type || !amount || !balance) return null;

    return {
        dateRight: right(date),
        descriptionX: description.x,
        typeX: type.x,
        amountRight: right(amount),
        balanceRight: right(balance),
    };
};

type DatedRow = {
    page: number;
    y: number;
    row: StatementRow;
    direction: Direction | null;
    // Description pieces with their vertical position, joined top to bottom at the end.
    pieces: { y: number; text: string }[];
};

const parseLines = (lines: PdfLine[]) => {
    const totals: StatementTotals = {};
    const period = findStatementPeriod(lines.map(textOf));
    const datedRows: DatedRow[] = [];
    const looseLines: { page: number; y: number; text: string }[] = [];

    for (const page of [...new Set(lines.map((line) => line.page))]) {
        const pageLines = lines.filter((line) => line.page === page);
        const headerLine = pageLines.find((line) => findColumns(line));
        // Pages without the table (the final legal notice) are skipped entirely.
        if (!headerLine) continue;
        const columns = findColumns(headerLine)!;

        for (const line of pageLines) {
            // Everything above the column header is account details or page header.
            if (line.y >= headerLine.y) continue;

            const text = textOf(line);

            // "… available balance: 6.46" ends the table.
            const closing = text.match(/available balance:?\s*(-?R?\s?[\d\s,]*\d\.\d{2})\s*$/i);
            if (closing) {
                const value = parseStatementAmount(closing[1]);
                if (value !== null) totals.closingBalance = value;
                continue;
            }

            let date: Date | null = null;
            let typeText = "";
            let amount: number | null = null;
            let balance: number | undefined;
            const description: string[] = [];

            for (const item of line.items) {
                const itemText = item.text.trim();

                if (!date && Math.abs(right(item) - columns.dateRight) < 12) {
                    const parsed = parseStatementDate(itemText, period);
                    if (parsed) {
                        date = parsed;
                        continue;
                    }
                }

                const value = parseStatementAmount(itemText);
                if (value !== null) {
                    const toAmount = Math.abs(right(item) - columns.amountRight);
                    const toBalance = Math.abs(right(item) - columns.balanceRight);
                    if (Math.min(toAmount, toBalance) <= 30) {
                        if (toAmount < toBalance) amount = value;
                        else balance = value;
                        continue;
                    }
                }

                if (item.x >= columns.typeX - 5) {
                    typeText = typeText ? `${typeText} ${itemText}` : itemText;
                } else if (item.x >= columns.descriptionX - 5) {
                    description.push(itemText);
                }
            }

            const descriptionText = description.filter(Boolean).join(" ");

            if (date && amount !== null) {
                const direction = TYPE_DIRECTIONS[typeText.toLowerCase()] ?? null;
                const unsigned = Math.abs(amount);

                datedRows.push({
                    page,
                    y: line.y,
                    direction,
                    row: {
                        date,
                        payee: "",
                        amount: direction === "in" ? unsigned : -unsigned,
                        balance,
                        notes: typeText || undefined,
                    },
                    pieces: descriptionText ? [{ y: line.y, text: descriptionText }] : [],
                });
                continue;
            }

            // A line with only description text is part of a wrapped description. Legal text
            // and notices start left of the description column, so they're never picked up.
            if (descriptionText && amount === null && balance === undefined && !date && line.items[0].x >= columns.descriptionX - 5) {
                looseLines.push({ page, y: line.y, text: descriptionText });
            }
        }
    }

    // Attach each wrapped line to the nearest dated row on the same page. Mukuru centres rows
    // vertically, so this is usually the row just below (9pt) rather than the one above (23pt).
    for (const loose of looseLines) {
        const nearest = datedRows
          .filter((dated) => dated.page === loose.page)
          .sort((a, b) => Math.abs(a.y - loose.y) - Math.abs(b.y - loose.y))[0];
        nearest?.pieces.push({ y: loose.y, text: loose.text });
    }

    // Unknown types: work out the direction from how the balance moved.
    let previousBalance: number | undefined;
    for (const dated of datedRows) {
        const { row } = dated;
        if (!dated.direction && previousBalance !== undefined && row.balance !== undefined) {
            const moved = Math.round((row.balance - previousBalance) * 100);
            const size = Math.round(Math.abs(row.amount) * 100);
            if (moved === size) dated.direction = "in";
            if (moved === -size) dated.direction = "out";
            if (dated.direction) row.amount = dated.direction === "in" ? Math.abs(row.amount) : -Math.abs(row.amount);
        }
        previousBalance = row.balance;

        // Top line first, as printed.
        row.payee = dated.pieces.sort((a, b) => b.y - a.y).map((piece) => piece.text).join(" ");
    }

    return { datedRows, totals };
};

export const mukuruParser: StatementParser = {
    id: "mukuru",
    name: "Mukuru",
    // Needs "Mukuru" on the statement AND its own column layout (with a Type column).
    // Standard Bank needs a "STANDARD BANK" line and Payments/Deposits columns, so the two
    // can't both match, even if a Standard Bank statement mentions a transfer to Mukuru.
    detect: (lines) =>
        lines.some((line) => /\bmukuru\b/i.test(textOf(line)))
        && lines.some((line) => findColumns(line) !== null),
    parse: (lines) => parseLines(lines).datedRows
      .filter((dated) => dated.row.payee)
      .map((dated) => dated.row),
    getTotals: (lines) => parseLines(lines).totals,
    getWarnings: (lines) => {
        const unsure = parseLines(lines).datedRows.filter((dated) => !dated.direction).length;
        return unsure
            ? [`Couldn't tell whether ${unsure} ${unsure === 1 ? "amount is" : "amounts are"} money in or out.`]
            : [];
    },
};

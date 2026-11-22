import type { PdfLine } from "@/lib/pdf/extract-lines";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { StatementCheck, StatementParser, StatementRow, StatementTotals } from "./types";
import { standardBankParser } from "./standard-bank";
import { mukuruParser } from "./mukuru";
import { capitecParser } from "./capitec";
import { fnbParser } from "./fnb";
import { absaParser } from "./absa";
import { genericParser } from "./generic";

// Add new bank parsers here. The first parser whose detect() matches is used, so the
// generic fallback must stay last. Bank parsers' detect() functions must not overlap.
export const STATEMENT_PARSERS: StatementParser[] = [
    standardBankParser,
    mukuruParser,
    capitecParser,
    fnbParser,
    absaParser,
    genericParser,
];

export class UnsupportedStatementError extends Error {
    constructor() {
        const banks = STATEMENT_PARSERS.filter((parser) => !parser.generic).map((parser) => parser.name).join(", ");
        super(
            `This statement couldn't be read. Fully supported banks: ${banks}. ` +
            "Other banks work if the statement has a table with date, description and amount columns.",
        );
        this.name = "UnsupportedStatementError";
    }
}

export class EmptyStatementError extends Error {
    constructor(bankName: string) {
        super(`No transactions were found in this ${bankName} statement.`);
        this.name = "EmptyStatementError";
    }
}

// Rounds to cents so floating point noise never reads as a mismatch.
const cents = (value: number) => Math.round(value * 100);

// Checks the parsed rows against the statement: each running balance should follow from the
// previous one, and the totals should match the statement's own summary.
const checkStatement = (rows: StatementRow[], totals: StatementTotals, warnings: string[]): StatementCheck => {
    const issues: string[] = [...warnings];

    let previous = totals.openingBalance;
    let balancesChecked = 0;
    const balanceMismatches: StatementCheck["balanceMismatches"] = [];

    rows.forEach((row, index) => {
        if (row.balance === undefined) {
            previous = undefined;
            return;
        }
        if (previous !== undefined) {
            balancesChecked++;
            const expected = previous + row.amount;
            if (cents(expected) !== cents(row.balance)) {
                balanceMismatches.push({ index, expected, printed: row.balance });
            }
        }
        previous = row.balance;
    });

    // Do the transactions add up from the first balance to the last? If so, mismatches in
    // between are the statement's printed balances being off, not amounts misread.
    const first = rows[0];
    const lastRowBalance = rows.at(-1)?.balance;
    const startBalance = totals.openingBalance
        ?? (first?.balance !== undefined ? first.balance - first.amount : undefined);
    const endsMatch = startBalance !== undefined
        && lastRowBalance !== undefined
        && cents(startBalance + rows.reduce((sum, row) => sum + row.amount, 0)) === cents(lastRowBalance);

    // Verified means the rows were actually compared with something on the statement:
    // nearly every row's running balance, or the statement's own totals.
    const totalsAvailable = totals.moneyIn !== undefined
        || totals.moneyOut !== undefined
        || totals.closingBalance !== undefined;
    const verified = totalsAvailable || balancesChecked >= Math.max(1, rows.length - 1);

    if (balanceMismatches.length > 0) {
        const count = balanceMismatches.length;
        const dates = balanceMismatches
          .slice(0, 5)
          .map(({ index }) => format(rows[index].date, "d MMM"))
          .join(", ");
        issues.push(
            `${count} ${count === 1 ? "row doesn't" : "rows don't"} match the running balance (${dates}${count > 5 ? ", …" : ""}).`,
        );
    }

    const moneyIn = rows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
    const moneyOut = rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0);

    if (totals.moneyIn !== undefined && cents(totals.moneyIn) !== cents(moneyIn)) {
        issues.push(`Money in is ${formatCurrency(moneyIn)}, but the statement says ${formatCurrency(totals.moneyIn)}.`);
    }
    if (totals.moneyOut !== undefined && cents(totals.moneyOut) !== cents(moneyOut)) {
        issues.push(`Money out is ${formatCurrency(moneyOut)}, but the statement says ${formatCurrency(totals.moneyOut)}.`);
    }

    const lastBalance = rows.at(-1)?.balance;
    if (totals.closingBalance !== undefined && lastBalance !== undefined && cents(totals.closingBalance) !== cents(lastBalance)) {
        issues.push(`The last balance is ${formatCurrency(lastBalance)}, but the statement ends on ${formatCurrency(totals.closingBalance)}.`);
    }

    return { ok: issues.length === 0, verified, issues, balanceMismatches, endsMatch };
};

export const parseStatement = (lines: PdfLine[]) => {
    const parser = STATEMENT_PARSERS.find((candidate) => candidate.detect(lines));

    if (!parser) {
        throw new UnsupportedStatementError();
    }

    const rows = parser.parse(lines);

    if (rows.length === 0) {
        throw new EmptyStatementError(parser.name);
    }

    const check = checkStatement(rows, parser.getTotals?.(lines) ?? {}, parser.getWarnings?.(lines) ?? []);

    return { bankName: parser.name, rows, check, isGeneric: Boolean(parser.generic) };
};

export type { StatementCheck, StatementParser, StatementRow, StatementTotals } from "./types";

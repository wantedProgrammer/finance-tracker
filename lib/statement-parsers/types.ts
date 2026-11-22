import type { PdfLine } from "@/lib/pdf/extract-lines";

export type StatementRow = {
    date: Date;
    payee: string;
    // In rand. Negative for money out, positive for money in.
    amount: number;
    // Running balance after this transaction, when the statement shows one.
    balance?: number;
    // Extra description lines (e.g. "DEBIT CARD PURCHASE FROM"), like CSV import keeps.
    notes?: string;
};

// Figures printed on the statement itself, used to check the parsed rows add up.
export type StatementTotals = {
    openingBalance?: number;
    // The balance printed at the end of the statement (e.g. Mukuru's "available balance").
    closingBalance?: number;
    moneyIn?: number;
    // Negative, like the rows.
    moneyOut?: number;
};

export type StatementCheck = {
    ok: boolean;
    // False when there was nothing to check against (no running balance and no totals).
    verified: boolean;
    // Plain-language problems, shown in the preview before importing.
    issues: string[];
    // Rows whose printed balance doesn't follow from the previous row, by index in the rows.
    balanceMismatches: { index: number; expected: number; printed: number }[];
    // True when the transactions add up from the first balance to the last, even if some
    // printed balances in between don't (a printing issue on the statement, not a misread).
    endsMatch: boolean;
};

export type StatementParser = {
    id: string;
    // Shown to the user, e.g. "Standard Bank".
    name: string;
    // True when these lines look like a statement from this bank.
    detect: (lines: PdfLine[]) => boolean;
    parse: (lines: PdfLine[]) => StatementRow[];
    // Optional: the statement's own opening balance and totals, to verify the parse.
    getTotals?: (lines: PdfLine[]) => StatementTotals;
    // Optional: problems the parser noticed itself (e.g. amounts it couldn't sign).
    getWarnings?: (lines: PdfLine[]) => string[];
    // True for the fallback parser: it isn't built for a specific bank, so the preview only
    // allows importing when the rows are verified (or the user confirms they checked them).
    generic?: boolean;
};

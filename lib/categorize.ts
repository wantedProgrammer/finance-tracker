// Pure matching logic for auto-categorizing transactions. No database access here,
// so it's easy to test against a CSV.

type Pattern = string | RegExp;

type DefaultRule = {
    category: string;
    patterns: Pattern[];
    incomeOnly?: boolean;
    expenseOnly?: boolean;
};

// Checked top to bottom, first match wins. Fees come first so that
// "FEE: PREPAID MOBILE PURCHASE" is a bank fee and not airtime.
export const DEFAULT_RULES: DefaultRule[] = [
    {
        category: "Bank Fees",
        patterns: [/\bFEE\b/, "MONTHLY MANAGEMENT", "EXCESS INTEREST"],
        expenseOnly: true,
    },
    {
        category: "Income",
        patterns: ["PAYMENT FROM", "TRANSFER FROM", "TELETRANSMISSION INWARD", "DEPOSIT", "SALARY"],
        incomeOnly: true,
    },
    {
        category: "Cash",
        patterns: ["CASH WITHDRAWAL", "INSTANT MONEY", "INSTANTMON", "DEBIT CARD CASH"],
        expenseOnly: true,
    },
    {
        category: "Food & Groceries",
        patterns: [
            "FOOD ZONE", "FOODZONE", "CHECKERS", "PNP", "PICK N PAY", "SHOPRITE",
            /\bSPAR\b/, "WOOLWORTHS", "KFC", "MCD", "STEERS", "MR D FOOD", "NANDO",
        ],
    },
    {
        category: "Transport",
        patterns: ["INDRIVE", "BOLT", "UBER"],
    },
    {
        category: "Airtime & Data",
        patterns: ["PREPAID MOBILE", "CELLC", "TELKM", "VODACOM", /\bMTN\b/],
    },
    {
        category: "Subscriptions",
        patterns: ["SPOTIFY", "NETFLIX", "SHOWMAX", "YOUTUBE"],
    },
    {
        category: "Clothing",
        patterns: ["MRPRICE", "MR PRICE"],
    },
    {
        category: "Health",
        patterns: ["DISCHEM", "DIS-CHEM", "CLICKS"],
    },
    {
        category: "Personal Care",
        patterns: ["BARBER", "SALON"],
    },
    {
        // Money sent to people. Checked last so merchants paid by PayShap
        // (e.g. INDRIVE "PAYSHAP PAYMENT TO") keep their own category.
        category: "Transfers",
        patterns: ["PAYMENT TO", "TRANSFER TO", "PAY BY PROXY"],
        expenseOnly: true,
    },
];

const MONTHS = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC";

// Strips card numbers, dates, reference numbers and punctuation so the same merchant
// always looks the same: "FOOD ZONE 5196*1931 13 MAY" -> "FOOD ZONE".
export const normalizePayee = (payee: string) =>
    payee
      .toUpperCase()
      .replace(/\d{4}\*\d{4}/g, " ")
      .replace(new RegExp(`\\b\\d{1,2}\\s(${MONTHS})\\b`, "g"), " ")
      .replace(/\d+/g, " ")
      .replace(/[^A-Z&' ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

// Readable payee for display: "FOOD ZONE 5196*1931 13 MAY" -> "Food Zone".
// Only tidies ALL-CAPS bank text; payees typed by hand ("Tanaka") are left as they are.
export const formatPayee = (payee: string) => {
    if (payee !== payee.toUpperCase()) return payee;

    const words = normalizePayee(payee).split(" ");

    // Drop one-letter card-processor prefixes like "C*", "M*" and "U*".
    while (words.length > 1 && words[0].length === 1) words.shift();

    const cleaned = words.join(" ");

    // Nothing readable left (e.g. "0844613256 11H06 335317916"): show the original.
    if (cleaned.length < MIN_PATTERN_LENGTH) return payee;

    return cleaned
      .toLowerCase()
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
};

// Learned patterns shorter than this are too vague to apply to other transactions.
export const MIN_PATTERN_LENGTH = 3;

export type CategorizableTransaction = {
    payee: string;
    notes?: string | null;
    amount: number;
};

export type UserRule = {
    pattern: string;
    categoryId: string;
};

export type CategoryMatch =
  | { categoryId: string }
  | { categoryName: string }
  | null;

const matchesPattern = (text: string, pattern: Pattern) =>
    typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);

export const matchCategory = (
    transaction: CategorizableTransaction,
    userRules: UserRule[],
): CategoryMatch => {
    // The user's own choices always win over the built-in rules.
    const payee = normalizePayee(transaction.payee);
    const userRule = userRules.find((rule) => rule.pattern === payee);
    if (userRule) {
        return { categoryId: userRule.categoryId };
    }

    const text = `${transaction.payee} ${transaction.notes ?? ""}`.toUpperCase();

    for (const rule of DEFAULT_RULES) {
        if (rule.incomeOnly && transaction.amount <= 0) continue;
        if (rule.expenseOnly && transaction.amount >= 0) continue;

        if (rule.patterns.some((pattern) => matchesPattern(text, pattern))) {
            return { categoryName: rule.category };
        }
    }

    return null;
};

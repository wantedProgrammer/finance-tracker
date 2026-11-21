// Shared helpers for bank statement parsers.

// "1 234.56", "1,234.56", "1234.56-", "-1 234.56", "1 234.56 Cr" / "Dr" -> signed number.
// Returns null when the text isn't an amount. "Cr" means money in, "Dr" or a minus sign money out.
export const parseStatementAmount = (text: string): number | null => {
    const cleaned = text.replace(/ /g, " ").trim().toUpperCase();
    const match = cleaned.match(/^(-)?R?\s*([\d\s,]*\d\.\d{2})\s*(-)?\s*(CR|DR)?$/);

    if (!match) return null;

    const [, leadingMinus, digits, trailingMinus, indicator] = match;
    const value = parseFloat(digits.replace(/[\s,]/g, ""));

    if (Number.isNaN(value)) return null;

    const isNegative = Boolean(leadingMinus || trailingMinus) || indicator === "DR";
    return isNegative ? -value : value;
};

// Works out the year for a day/month-only date from the statement period. A December to
// January statement puts December dates in the earlier year and January in the later one.
export const resolveYear = (
    month: number,
    period: { from: Date; to: Date },
) => {
    const fromYear = period.from.getFullYear();
    const toYear = period.to.getFullYear();

    if (fromYear === toYear) return fromYear;

    // Period crosses a year end: months at or after the start month belong to the start year.
    return month >= period.from.getMonth() + 1 ? fromYear : toYear;
};

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const fullYear = (year: string) => (year.length === 2 ? 2000 + Number(year) : Number(year));

const validDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

// Dates as South African statements print them. Day comes before month, as is usual in SA:
// "15 May 26", "15 May 2026", "15-May-2026", "15 May", "15/05/2026", "15.05.26", "2026-05-15",
// "2026/05/15", "15/05". Dates without a year take it from the statement period.
export const parseStatementDate = (
    text: string,
    period?: { from: Date; to: Date } | null,
): Date | null => {
    const value = text.trim().replace(/\s+/g, " ").replace(/,/g, "");
    const fallbackYear = (month: number) => (period ? resolveYear(month, period) : new Date().getFullYear());

    // 15 May 26 / 15 May 2026 / 15-May-2026 / 15 May
    let match = value.match(/^(\d{1,2})[\s\-/.]([A-Za-z]{3,9})\.?(?:[\s\-/.](\d{2}|\d{4}))?$/);
    if (match) {
        const month = MONTH_NAMES.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
        if (month === 0) return null;
        return validDate(match[3] ? fullYear(match[3]) : fallbackYear(month), month, Number(match[1]));
    }

    // 2026-05-15 / 2026/05/15
    match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (match) {
        return validDate(Number(match[1]), Number(match[2]), Number(match[3]));
    }

    // 15/05/2026 / 15-05-26 / 15.05.2026
    match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (match) {
        return validDate(fullYear(match[3]), Number(match[2]), Number(match[1]));
    }

    // 15/05 (no year)
    match = value.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) {
        const month = Number(match[2]);
        return validDate(fallbackYear(month), month, Number(match[1]));
    }

    return null;
};

// Statement period from a line like "From: 14 May 26 To: 12 Aug 26" or
// "Statement period 01/05/2026 - 31/05/2026". Returns null if not found.
export const findStatementPeriod = (texts: string[]) => {
    const datePattern = "(\\d{1,2}[\\s\\-/.][A-Za-z]{3,9}[\\s\\-/.]\\d{2,4}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}|\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2})";

    for (const text of texts) {
        const match = text.match(new RegExp(`${datePattern}\\s*(?:-|to|until|–)\\s*(?:To:?\\s*)?${datePattern}`, "i"));
        const from = match && parseStatementDate(match[1]);
        const to = match && parseStatementDate(match[2]);
        if (from && to && from <= to) return { from, to };
    }

    // Separate "From: …" and "To: …" lines.
    const find = (label: string) => {
        for (const text of texts) {
            const match = text.match(new RegExp(`\\b${label}:?\\s*${datePattern}`, "i"));
            const date = match && parseStatementDate(match[1]);
            if (date) return date;
        }
        return null;
    };

    const from = find("From");
    const to = find("To");
    return from && to && from <= to ? { from, to } : null;
};

// Stable ID for a parsed row, so importing the same statement twice skips what's already there.
// Includes the running balance so two identical purchases on the same day stay distinct.
export const createStatementExternalId = async (row: {
    date: Date;
    amount: number;
    payee: string;
    balance?: number;
}) => {
    const day = [
        row.date.getFullYear(),
        String(row.date.getMonth() + 1).padStart(2, "0"),
        String(row.date.getDate()).padStart(2, "0"),
    ].join("-");

    const key = [
        "pdf",
        day,
        row.amount.toFixed(2),
        row.payee.trim().toUpperCase(),
        row.balance === undefined ? "" : row.balance.toFixed(2),
    ].join("|");

    // Web Crypto is built into browsers; no extra library needed.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");

    return `pdf_${hex}`;
};

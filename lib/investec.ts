// Server-only Investec Programmable Banking client.
// Importing this from a client component fails the build, so credentials and
// access tokens can never be bundled into or sent to the browser.
import "server-only";

import { z } from "zod";

export class InvestecError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = "InvestecError";
    }
}

const getConfig = () => {
    const baseUrl = process.env.INVESTEC_BASE_URL;
    const clientId = process.env.INVESTEC_CLIENT_ID;
    const clientSecret = process.env.INVESTEC_CLIENT_SECRET;
    const apiKey = process.env.INVESTEC_API_KEY;

    if (!baseUrl || !clientId || !clientSecret || !apiKey) {
        throw new InvestecError("Investec is not configured. Check the INVESTEC_ environment variables.");
    }

    return { baseUrl: baseUrl.replace(/\/$/, ""), clientId, clientSecret, apiKey };
};

// The credentials above belong to one person, so anyone using them sees that person's
// accounts. Only Clerk users listed in INVESTEC_ALLOWED_USER_IDS (comma-separated) may use
// the integration. Not set means nobody: a missing setting can't expose bank data.
export const isInvestecAllowed = (userId: string) => {
    const allowed = (process.env.INVESTEC_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    return allowed.includes(userId);
};

export const isInvestecSandbox = () =>
    (process.env.INVESTEC_BASE_URL ?? "").includes("sandbox");

const tokenSchema = z.object({
    access_token: z.string(),
    expires_in: z.number(),
});

const accountSchema = z.object({
    accountId: z.string(),
    accountNumber: z.string(),
    accountName: z.string(),
    referenceName: z.string().optional(),
    productName: z.string().optional(),
});

const accountsResponseSchema = z.object({
    data: z.object({
        accounts: z.array(accountSchema),
    }),
});

const transactionSchema = z.object({
    accountId: z.string(),
    type: z.enum(["DEBIT", "CREDIT"]),
    status: z.string(),
    description: z.string(),
    transactionType: z.string().nullish(),
    postedOrder: z.number().nullish(),
    postingDate: z.string().nullish(),
    transactionDate: z.string().nullish(),
    amount: z.number(),
    uuid: z.string().nullish(),
});

const transactionsResponseSchema = z.object({
    data: z.object({
        transactions: z.array(transactionSchema),
    }),
    meta: z.object({
        totalPages: z.number().optional(),
    }).optional(),
});

// Safety cap so a misbehaving response can never loop forever.
const MAX_PAGES = 50;

export type InvestecAccount = z.infer<typeof accountSchema>;
export type InvestecTransaction = z.infer<typeof transactionSchema>;

// Tokens last about 30 minutes; reuse one per server instance until shortly before expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

const getToken = async () => {
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.value;
    }

    const { baseUrl, clientId, clientSecret, apiKey } = getConfig();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(`${baseUrl}/identity/v2/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${basic}`,
            "x-api-key": apiKey,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
        cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
        throw new InvestecError("Investec rejected the credentials. Check the client ID, secret and API key.", response.status);
    }

    if (!response.ok) {
        throw new InvestecError(`Investec token request failed (HTTP ${response.status}).`, response.status);
    }

    const token = tokenSchema.parse(await response.json());

    cachedToken = {
        value: token.access_token,
        // Refresh a minute early so a token never expires mid-request.
        expiresAt: Date.now() + (token.expires_in - 60) * 1000,
    };

    return cachedToken.value;
};

const investecGet = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
    const { baseUrl } = getConfig();
    const token = await getToken();

    const response = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (response.status === 401) {
        // The token may have been revoked early; drop it so the next call gets a fresh one.
        cachedToken = null;
        throw new InvestecError("Investec authorisation failed. Please try again.", 401);
    }

    if (!response.ok) {
        throw new InvestecError(`Investec request failed (HTTP ${response.status}).`, response.status);
    }

    const parsed = schema.safeParse(await response.json());

    if (!parsed.success) {
        throw new InvestecError("Investec returned data in an unexpected format.");
    }

    return parsed.data;
};

export const listInvestecAccounts = async () => {
    const response = await investecGet("/za/pb/v1/accounts", accountsResponseSchema);
    return response.data.accounts;
};

// Reads every page. A real account with many transactions can return more than one page
// (meta.totalPages); reading only the first would silently miss transactions.
export const listInvestecTransactions = async (
    accountId: string,
    fromDate: string,
    toDate: string,
) => {
    const path = `/za/pb/v1/accounts/${encodeURIComponent(accountId)}/transactions`;
    const getPage = (page: number) => {
        const params = new URLSearchParams({ fromDate, toDate });
        if (page > 1) params.set("page", String(page));
        return investecGet(`${path}?${params}`, transactionsResponseSchema);
    };

    const firstPage = await getPage(1);
    const totalPages = firstPage.meta?.totalPages ?? 1;

    if (totalPages > MAX_PAGES) {
        throw new InvestecError(
            `Investec returned ${totalPages} pages of transactions. Sync a shorter period.`,
        );
    }

    const transactions = [...firstPage.data.transactions];
    const firstPageKey = firstPage.data.transactions.map((transaction) => transaction.uuid).join(",");

    for (let page = 2; page <= totalPages; page++) {
        const nextPage = await getPage(page);
        const pageKey = nextPage.data.transactions.map((transaction) => transaction.uuid).join(",");

        // If Investec ignored the page parameter we'd get page 1 again. Stop loudly rather
        // than import an incomplete set and report it as up to date.
        if (pageKey === firstPageKey) {
            throw new InvestecError(
                "Investec returned more pages than Horizon could read. Sync stopped so no transactions are missed.",
            );
        }

        transactions.push(...nextPage.data.transactions);
    }

    // Drop any transaction that appears on two pages.
    const seen = new Set<string>();
    return transactions.filter((transaction) => {
        if (!transaction.uuid) return true;
        if (seen.has(transaction.uuid)) return false;
        seen.add(transaction.uuid);
        return true;
    });
};

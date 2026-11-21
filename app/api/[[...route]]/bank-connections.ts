import { Hono } from "hono";
import { z } from "zod";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { format, parse, subDays } from "date-fns";

import { db } from "@/db/drizzle";
import { accounts, bankConnections, transactions } from "@/db/schema";
import { convertAmountToMiliUnits } from "@/lib/utils";
import {
  InvestecError,
  isInvestecSandbox,
  listInvestecAccounts,
  listInvestecTransactions,
  type InvestecTransaction,
} from "@/lib/investec";

const PROVIDER = "investec";

// Late-posting transactions can land a few days after the last sync, so look back a week.
const SYNC_OVERLAP_DAYS = 7;
const FIRST_SYNC_DAYS = 90;

const maskAccountNumber = (accountNumber: string) => `•••• ${accountNumber.slice(-4)}`;

// Investec's uuid is stable for posted transactions. If one is ever missing, fall back to a
// hash of the transaction's details. postedOrder keeps two identical same-day purchases apart.
const getExternalId = (transaction: InvestecTransaction) => {
  if (transaction.uuid) return transaction.uuid;

  return "hash_" + createHash("sha256")
    .update([
      transaction.accountId,
      transaction.postingDate,
      transaction.transactionDate,
      transaction.amount,
      transaction.type,
      transaction.description,
      transaction.postedOrder,
    ].join("|"))
    .digest("hex");
};

// Never pass Investec's raw error details to the client; the message is our own wording.
const investecErrorResponse = (error: unknown) => {
  const message = error instanceof InvestecError
    ? error.message
    : "Could not reach Investec. Please try again.";

  return { error: message };
};

const app = new Hono()
  .get(
    "/",
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [connection] = await db
        .select({
          id: bankConnections.id,
          provider: bankConnections.provider,
          externalAccountName: bankConnections.externalAccountName,
          accountId: bankConnections.accountId,
          accountName: accounts.name,
          lastSyncedAt: bankConnections.lastSyncedAt,
        })
        .from(bankConnections)
        .innerJoin(accounts, eq(bankConnections.accountId, accounts.id))
        .where(and(
          eq(bankConnections.userId, auth.userId),
          eq(bankConnections.provider, PROVIDER),
        ));

      return c.json({
        data: {
          connection: connection ?? null,
          isSandbox: isInvestecSandbox(),
        },
      });
    },
  )
  .get(
    "/investec/accounts",
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        const investecAccounts = await listInvestecAccounts();

        return c.json({
          data: investecAccounts.map((account) => ({
            id: account.accountId,
            name: account.referenceName || account.accountName,
            productName: account.productName ?? null,
            accountNumber: maskAccountNumber(account.accountNumber),
          })),
        });
      } catch (error) {
        return c.json(investecErrorResponse(error), 502);
      }
    },
  )
  .post(
    "/",
    clerkMiddleware(),
    zValidator(
      "json",
      z.object({
        externalAccountId: z.string().min(1),
        externalAccountName: z.string().min(1),
        accountId: z.string().min(1),
      }),
    ),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid("json");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [ownedAccount] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, values.accountId), eq(accounts.userId, auth.userId)));

      if (!ownedAccount) {
        return c.json({ error: "Not found" }, 404);
      }

      const [existing] = await db
        .select({ id: bankConnections.id })
        .from(bankConnections)
        .where(and(
          eq(bankConnections.userId, auth.userId),
          eq(bankConnections.provider, PROVIDER),
        ));

      if (existing) {
        return c.json({ error: "Investec is already connected" }, 409);
      }

      // Check the Investec account really exists and take its name from Investec,
      // not from the request.
      let investecAccount;
      try {
        const investecAccounts = await listInvestecAccounts();
        investecAccount = investecAccounts.find((account) => account.accountId === values.externalAccountId);
      } catch (error) {
        return c.json(investecErrorResponse(error), 502);
      }

      if (!investecAccount) {
        return c.json({ error: "Investec account not found" }, 404);
      }

      const [data] = await db
        .insert(bankConnections)
        .values({
          id: createId(),
          userId: auth.userId,
          provider: PROVIDER,
          externalAccountId: investecAccount.accountId,
          externalAccountName: investecAccount.referenceName || investecAccount.accountName,
          accountId: ownedAccount.id,
        })
        .returning({ id: bankConnections.id });

      return c.json({ data });
    },
  )
  .post(
    "/sync",
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [connection] = await db
        .select()
        .from(bankConnections)
        .where(and(
          eq(bankConnections.userId, auth.userId),
          eq(bankConnections.provider, PROVIDER),
        ));

      if (!connection) {
        return c.json({ error: "Not found" }, 404);
      }

      const today = new Date();
      const fromDate = connection.lastSyncedAt
        ? subDays(connection.lastSyncedAt, SYNC_OVERLAP_DAYS)
        : subDays(today, FIRST_SYNC_DAYS);

      let investecTransactions;
      try {
        investecTransactions = await listInvestecTransactions(
          connection.externalAccountId,
          format(fromDate, "yyyy-MM-dd"),
          format(today, "yyyy-MM-dd"),
        );
      } catch (error) {
        return c.json(investecErrorResponse(error), 502);
      }

      // Only posted transactions: pending ones can still change or disappear.
      // R0.00 entries (card checks, reversed authorisations) would only clutter the list.
      const posted = investecTransactions.filter(
        (transaction) => transaction.status === "POSTED" && transaction.amount !== 0,
      );

      const values = posted.map((transaction) => {
        const miliunits = convertAmountToMiliUnits(Math.abs(transaction.amount));
        const day = transaction.transactionDate || transaction.postingDate || format(today, "yyyy-MM-dd");

        return {
          id: createId(),
          accountId: connection.accountId,
          // Investec sends positive amounts; DEBIT is money out, CREDIT is money in.
          amount: transaction.type === "DEBIT" ? -miliunits : miliunits,
          date: parse(day, "yyyy-MM-dd", new Date()),
          payee: transaction.description,
          externalId: getExternalId(transaction),
          categoryId: null,
        };
      });

      // The unique index on (accountId, externalId) makes re-syncing safe: rows that are
      // already there are skipped, never duplicated.
      const inserted = values.length
        ? await db
            .insert(transactions)
            .values(values)
            .onConflictDoNothing({ target: [transactions.accountId, transactions.externalId] })
            .returning({ id: transactions.id })
        : [];

      await db
        .update(bankConnections)
        .set({ lastSyncedAt: today })
        .where(eq(bankConnections.id, connection.id));

      return c.json({
        data: {
          imported: inserted.length,
          skipped: values.length - inserted.length,
        },
      });
    },
  )
  .delete(
    "/",
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Only the connection is removed; imported transactions stay in the account.
      const [data] = await db
        .delete(bankConnections)
        .where(and(
          eq(bankConnections.userId, auth.userId),
          eq(bankConnections.provider, PROVIDER),
        ))
        .returning({ id: bankConnections.id });

      if (!data) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data });
    },
  );

export default app;

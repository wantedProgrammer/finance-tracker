import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

import { db } from "@/db/drizzle";
import {
  accounts,
  categories,
  categoryRules,
  transactions,
} from "@/db/schema";

const app = new Hono()
  .delete(
    "/",
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const userId = auth.userId;

      // Transactions have no userId, so they're matched through the user's own accounts.
      const userAccountIds = db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      // The neon-http driver can't run db.transaction(), but a batch runs as a single
      // database transaction, so either everything is deleted or nothing is.
      // Order respects foreign keys: transactions, then rules, then categories and accounts.
      // Every statement is limited to this user. Their Clerk account is not touched.
      const [
        deletedTransactions,
        ,
        deletedCategories,
        deletedAccounts,
      ] = await db.batch([
        db.delete(transactions)
          .where(inArray(transactions.accountId, userAccountIds))
          .returning({ id: transactions.id }),
        db.delete(categoryRules)
          .where(eq(categoryRules.userId, userId))
          .returning({ id: categoryRules.id }),
        db.delete(categories)
          .where(eq(categories.userId, userId))
          .returning({ id: categories.id }),
        db.delete(accounts)
          .where(eq(accounts.userId, userId))
          .returning({ id: accounts.id }),
      ]);

      return c.json({
        data: {
          transactions: deletedTransactions.length,
          categories: deletedCategories.length,
          accounts: deletedAccounts.length,
        },
      });
    },
  );

export default app;

import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { differenceInDays, endOfDay, parse, subDays } from "date-fns";

import { db } from "@/db/drizzle";
import { accounts, categories, transactions } from "@/db/schema";
import { calculatePercentageChange, fillMissingDays } from "@/lib/utils";

const app = new Hono()
  .get(
    "/",
    clerkMiddleware(),
    zValidator(
      "query",
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        accountId: z.string().optional(),
      }),
    ),
    async (c) => {
      const auth = getAuth(c);
      const { from, to, accountId } = c.req.valid("query");

      if (!auth?.userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const defaultTo = endOfDay(new Date());
      const defaultFrom = subDays(defaultTo, 30);

      const startDate = from
        ? parse(from, "yyyy-MM-dd", new Date())
        : defaultFrom;

      const endDate = to
        ? endOfDay(parse(to, "yyyy-MM-dd", new Date()))
        : defaultTo;

      // The previous period has the same length and ends right before the current one starts.
      const periodLength = differenceInDays(endDate, startDate) + 1;
      const lastPeriodStart = subDays(startDate, periodLength);
      const lastPeriodEnd = subDays(endDate, periodLength);

      const userTransactions = (start: Date, end: Date) =>
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, auth.userId!),
          gte(transactions.date, start),
          lte(transactions.date, end),
        );

      // All sums stay in miliunits; the client hook converts them.
      async function fetchFinancialData(start: Date, end: Date) {
        return await db
          .select({
            // COALESCE so a period with no transactions returns 0 instead of null.
            income: sql`COALESCE(SUM(CASE WHEN ${transactions.amount} >= 0 THEN ${transactions.amount} ELSE 0 END), 0)`.mapWith(Number),
            expenses: sql`COALESCE(SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END), 0)`.mapWith(Number),
            remaining: sql`COALESCE(SUM(${transactions.amount}), 0)`.mapWith(Number),
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(userTransactions(start, end));
      }

      const [currentPeriod] = await fetchFinancialData(startDate, endDate);
      const [lastPeriod] = await fetchFinancialData(lastPeriodStart, lastPeriodEnd);

      const incomeChange = calculatePercentageChange(currentPeriod.income, lastPeriod.income);
      const expensesChange = calculatePercentageChange(currentPeriod.expenses, lastPeriod.expenses);
      const remainingChange = calculatePercentageChange(currentPeriod.remaining, lastPeriod.remaining);

      const categoryName = sql<string>`COALESCE(${categories.name}, 'Uncategorized')`;

      const category = await db
        .select({
          name: categoryName,
          value: sql`SUM(ABS(${transactions.amount}))`.mapWith(Number),
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            userTransactions(startDate, endDate),
            lt(transactions.amount, 0),
          )
        )
        .groupBy(categoryName)
        .orderBy(desc(sql`SUM(ABS(${transactions.amount}))`));

      const topCategories = category.slice(0, 3);
      const otherCategories = category.slice(3);
      const otherSum = otherCategories.reduce((sum, current) => sum + current.value, 0);

      const finalCategories = [...topCategories];

      if (otherCategories.length > 0) {
        finalCategories.push({
          name: "Other",
          value: otherSum,
        });
      }

      const day = sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM-DD')`;

      const activeDays = await db
        .select({
          date: day,
          income: sql`SUM(CASE WHEN ${transactions.amount} >= 0 THEN ${transactions.amount} ELSE 0 END)`.mapWith(Number),
          expenses: sql`SUM(CASE WHEN ${transactions.amount} < 0 THEN ABS(${transactions.amount}) ELSE 0 END)`.mapWith(Number),
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(userTransactions(startDate, endDate))
        .groupBy(day)
        .orderBy(day);

      const days = fillMissingDays(
        activeDays.map((activeDay) => ({
          ...activeDay,
          date: parse(activeDay.date, "yyyy-MM-dd", new Date()),
        })),
        startDate,
        endDate,
      );

      return c.json({
        data: {
          remainingAmount: currentPeriod.remaining,
          remainingChange,
          incomeAmount: currentPeriod.income,
          incomeChange,
          expensesAmount: currentPeriod.expenses,
          expensesChange,
          categories: finalCategories,
          days,
        },
      });
    },
  );

export default app;

import { Hono } from "hono";
import { 
  eq, 
  and, 
  gte,
  lte,
  desc,
  sql,
  inArray,
  isNull,
} from "drizzle-orm";

import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { zValidator } from "@hono/zod-validator";
import { db } from "@/db/drizzle";

import { 
  insertTransactionSchema, 
  transactions,
  categories,
  accounts
 } from "@/db/schema";

import { createId } from "@paralleldrive/cuid2";
import { autoCategorize, categorizeExisting, learnCategory } from "@/lib/auto-categorize";
import { z } from "zod";
import { subDays, parse, endOfDay } from "date-fns";


// Checks every account and category a transaction points at belongs to the user,
// so nobody can write transactions into someone else's account.
const ownsReferences = async (
  userId: string,
  values: { accountId: string; categoryId?: string | null }[],
) => {
  const accountIds = [...new Set(values.map((value) => value.accountId))];
  const categoryIds = [
    ...new Set(values.map((value) => value.categoryId).filter((id): id is string => !!id)),
  ];

  if (accountIds.length) {
    const ownedAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), inArray(accounts.id, accountIds)));

    if (ownedAccounts.length !== accountIds.length) return false;
  }

  if (categoryIds.length) {
    const ownedCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.userId, userId), inArray(categories.id, categoryIds)));

    if (ownedCategories.length !== categoryIds.length) return false;
  }

  return true;
};

const app = new Hono()
   .get("/",
    zValidator("query", z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      accountId: z.string().optional(),
    })),

    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);
      const { from, to, accountId } = c.req.valid("query");

      if(!auth?.userId){
        return c.json({ error: "unauthourized" }, 401);
      }

      const defaultTo = endOfDay(new Date());
      const defaultFrom = subDays(defaultTo, 30);

      const startDate = from 
        ? parse(from, "yyyy-MM-dd", new Date()) 
        : defaultFrom;

      const endDate = to 
        ? endOfDay(parse(to, "yyyy-MM-dd", new Date()))
        : defaultTo;

    
     const data = await db
       .select({
         id: transactions.id,
         amount: transactions.amount,
         payee: transactions.payee,
         notes: transactions.notes,
         date: transactions.date,
         accounts: accounts.name,
         accountId: transactions.accountId,
         category: categories.name,
         categoryId: transactions.categoryId,
       })
       .from(transactions)
       .innerJoin(accounts, eq(transactions.accountId, accounts.id))
       .leftJoin(categories, eq(transactions.categoryId, categories.id))
       .where(
        and(
          accountId ? eq(transactions.accountId, accountId) : undefined,
          eq(accounts.userId, auth.userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
       )
       .orderBy(desc(transactions.date));

     return c.json({ data });
    })
    // Must stay above "/:id", otherwise "export" is treated as a transaction id.
    .get(
      "/export",
      clerkMiddleware(),
      async (c) => {
        const auth = getAuth(c);

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // Every transaction the user has, ignoring the date and account filters.
        const data = await db
          .select({
            date: transactions.date,
            payee: transactions.payee,
            amount: transactions.amount,
            notes: transactions.notes,
            account: accounts.name,
            category: categories.name,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(eq(accounts.userId, auth.userId))
          .orderBy(desc(transactions.date));

        return c.json({ data });
      },
    )
    .get(
      "/:id",
      zValidator("param", z.object({
        id: z.string().optional()
      })),
      clerkMiddleware(),
      async (c) => {
        const auth = getAuth(c);
        const { id } = c.req.valid("param");

        if (!id) {
          return c.json({ error: "Missing ID" }, 400);
        }

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const [data] = await db
          .select({
            id: transactions.id,
            amount: transactions.amount,
            payee: transactions.payee,
            notes: transactions.notes,
            date: transactions.date,
            accountId: transactions.accountId,
            categoryId: transactions.categoryId,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .where(
            and(
              eq(accounts.userId, auth.userId), 
              eq(transactions.id, id)
            ),
          );

        if (!data) {
          return c.json({ error: "Not found" }, 404);
        }

        return c.json({ data });
      },
    )
    .post(
      "/",
      clerkMiddleware(),
      zValidator("json", insertTransactionSchema.omit({
        id: true,
      })),
      async (c) => {
        const auth = getAuth(c);
        const values = c.req.valid("json");

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (!(await ownsReferences(auth.userId, [values]))) {
          return c.json({ error: "Not found" }, 404);
        }

        // No category picked: try the rules. Category picked: learn it for this payee.
        const [value] = await autoCategorize(auth.userId, [values]);

        const [data] = await db.insert
        (transactions).values({
          id: createId(),
          ...value,
        }).returning();

        if (values.categoryId) {
          await learnCategory(auth.userId, values.payee, values.categoryId);
        }

        return c.json({ data });
      })
    .post(
      "/bulk-create",
      clerkMiddleware(),
      zValidator(
        "json",
        z.array(
          insertTransactionSchema.omit({
            id: true,
          }),
        ),
      ),
      async (c) => {
        const auth = getAuth(c);
        const values = c.req.valid("json");

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (!(await ownsReferences(auth.userId, values))) {
          return c.json({ error: "Not found" }, 404);
        }

        // Rows with an externalId (PDF statements) that are already in their account are
        // skipped before categorizing, so re-importing never recreates deleted categories.
        // Rows without one (manual entry, CSV) are always inserted, as before.
        const externalIds = values.flatMap((value) => value.externalId ? [value.externalId] : []);
        const existing = externalIds.length
          ? await db
              .select({ accountId: transactions.accountId, externalId: transactions.externalId })
              .from(transactions)
              .where(and(
                inArray(transactions.externalId, externalIds),
                inArray(transactions.accountId, [...new Set(values.map((value) => value.accountId))]),
              ))
          : [];
        const existingKeys = new Set(existing.map((row) => `${row.accountId}|${row.externalId}`));
        let newValues = values.filter(
          (value) => !value.externalId || !existingKeys.has(`${value.accountId}|${value.externalId}`),
        );

        // Statement rows also skip transactions already entered another way (CSV import or by
        // hand), matched on date, amount and payee. Only rows without an externalId are
        // compared, so an earlier PDF import is never mistaken for a different identical one.
        // Matches are counted: two identical purchases on one day only cancel two existing ones.
        const statementRows = newValues.filter((value) => value.externalId);

        if (statementRows.length) {
          const matchKey = (row: { accountId: string; date: Date; amount: number; payee: string }) =>
            `${row.accountId}|${row.date.getTime()}|${row.amount}|${row.payee.trim().toUpperCase()}`;

          const times = statementRows.map((value) => value.date.getTime());
          const candidates = await db
            .select({
              accountId: transactions.accountId,
              date: transactions.date,
              amount: transactions.amount,
              payee: transactions.payee,
            })
            .from(transactions)
            .where(and(
              inArray(transactions.accountId, [...new Set(statementRows.map((value) => value.accountId))]),
              isNull(transactions.externalId),
              gte(transactions.date, new Date(Math.min(...times))),
              lte(transactions.date, new Date(Math.max(...times))),
            ));

          const available = new Map<string, number>();
          for (const candidate of candidates) {
            const key = matchKey(candidate);
            available.set(key, (available.get(key) ?? 0) + 1);
          }

          newValues = newValues.filter((value) => {
            if (!value.externalId) return true;

            const key = matchKey(value);
            const count = available.get(key) ?? 0;
            if (count === 0) return true;

            available.set(key, count - 1);
            return false;
          });
        }

        const categorizedValues = await autoCategorize(auth.userId, newValues);

        // onConflictDoNothing also covers duplicates within this upload and races with
        // another import. NULL externalIds never conflict.
        const data = categorizedValues.length
          ? await db
              .insert(transactions)
              .values(
                categorizedValues.map((value) => ({
                  id: createId(),
                  ...value,
                }))
              )
              .onConflictDoNothing({ target: [transactions.accountId, transactions.externalId] })
              .returning()
          : [];

        return c.json({
          data,
          imported: data.length,
          skipped: values.length - data.length,
        });
      }
    )
    .post(
      "/categorize",
      clerkMiddleware(),
      async (c) => {
        const auth = getAuth(c);

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const data = await categorizeExisting(auth.userId);

        return c.json({ data });
      }
    )
    .post(
      "/bulk-delete",
      clerkMiddleware(),
      zValidator(
        "json",
        z.object({
          ids: z.array(z.string()),
        }),
      ),
      async (c) => {
        const auth = getAuth(c);
        const values = c.req.valid("json");

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const transactionsToDelete = db.$with("transactions_to_delete").as(
          db.select({ id: transactions.id }).from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
              inArray(transactions.id, values.ids),
              eq(accounts.userId, auth.userId)
            ))
        )

        const data = await db
          .with(transactionsToDelete)
          .delete(transactions)
          .where(
            inArray(transactions.id, sql`(select id from ${transactionsToDelete})`)
          )
          .returning({
            id: transactions.id,
          });
          

        return c.json({ data });

      },

    )
    .patch(
      "/:id",
      clerkMiddleware(),
      zValidator(
        "param",
        z.object({
          id: z.string().optional(),
        }),
      ),
      zValidator(
        "json",
        insertTransactionSchema.omit({
          id: true,
        }),
      ),
      async (c) => {
        const auth = getAuth(c);
        const { id } = c.req.valid("param");
        const values = c.req.valid("json");

        if (!id) {
          return c.json({ error: "Missing ID" }, 400);
        }

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (!(await ownsReferences(auth.userId, [values]))) {
          return c.json({ error: "Not found" }, 404);
        }

        const transactionsToUpdate = db.$with("transactions_to_update").as(
          db.select({ id: transactions.id })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
              eq(transactions.id, id),
              eq(accounts.userId, auth.userId)
            ))
        )

        const [data] = await db
          .with(transactionsToUpdate)
          .update(transactions)
          .set(values)
          .where(
            inArray(transactions.id, sql`(select id from ${transactionsToUpdate})`)
          )
          .returning();

        if (!data) {
          return c.json({ error: "Not found" }, 404);
        }

        if (values.categoryId) {
          await learnCategory(auth.userId, data.payee, values.categoryId);
        }

        return c.json({ data });
      },
    )
    .delete(
      "/:id",
      clerkMiddleware(),
      zValidator(
        "param",
        z.object({
          id: z.string().optional(),
        }),
      ),
      async (c) => {
        const auth = getAuth(c);
        const { id } = c.req.valid("param");

        if (!id) {
          return c.json({ error: "Missing ID" }, 400);
        }

        if (!auth?.userId) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const transactionsToDelete = db.$with("transactions_to_delete").as(
          db.select({ id: transactions.id })
            .from(transactions)
            .innerJoin(accounts, eq(transactions.accountId, accounts.id))
            .where(and(
              eq(transactions.id, id),
              eq(accounts.userId, auth.userId)
            ))
        )

        const [data] = await db
          .with(transactionsToDelete)
          .delete(transactions)
          .where(
            inArray(
              transactions.id,
              sql`(select id from ${transactionsToDelete})`
            ),
          )
          .returning({
            id: transactions.id
          });

        if (!data) {
          return c.json({ error: "Not found" }, 404);
        }

        return c.json({ data });
      },
    );


export default app;
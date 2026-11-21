// Server-only: database side of auto-categorizing. Used by the transactions API.
import { and, eq, inArray, isNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db/drizzle";
import { accounts, categories, categoryRules, transactions } from "@/db/schema";
import {
    matchCategory,
    normalizePayee,
    MIN_PATTERN_LENGTH,
    type CategorizableTransaction,
} from "@/lib/categorize";

// Fills in categoryId for every row that doesn't have one and matches a rule.
// Built-in categories that don't exist yet are created for the user.
export const autoCategorize = async <T extends CategorizableTransaction & { categoryId?: string | null }>(
    userId: string,
    rows: T[],
): Promise<T[]> => {
    if (!rows.some((row) => !row.categoryId)) return rows;

    const userRules = await db
      .select({ pattern: categoryRules.pattern, categoryId: categoryRules.categoryId })
      .from(categoryRules)
      .where(eq(categoryRules.userId, userId));

    const userCategories = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId));

    const categoryIdsByName = new Map(
        userCategories.map((category) => [category.name.toLowerCase(), category.id])
    );

    const matches = rows.map((row) => (row.categoryId ? null : matchCategory(row, userRules)));

    // Create any built-in categories the user doesn't have yet, in one insert.
    const missingNames = [...new Set(
        matches
          .map((match) => (match && "categoryName" in match ? match.categoryName : null))
          .filter((name): name is string => !!name && !categoryIdsByName.has(name.toLowerCase()))
    )];

    if (missingNames.length) {
        const created = await db
          .insert(categories)
          .values(missingNames.map((name) => ({ id: createId(), name, userId })))
          .returning({ id: categories.id, name: categories.name });

        created.forEach((category) => categoryIdsByName.set(category.name.toLowerCase(), category.id));
    }

    return rows.map((row, index) => {
        const match = matches[index];
        if (!match) return row;

        const categoryId = "categoryId" in match
          ? match.categoryId
          : categoryIdsByName.get(match.categoryName.toLowerCase());

        return categoryId ? { ...row, categoryId } : row;
    });
};

// Remembers that this payee belongs to this category, then applies it to the
// user's other uncategorized transactions from the same payee.
export const learnCategory = async (
    userId: string,
    payee: string,
    categoryId: string,
) => {
    const pattern = normalizePayee(payee);
    if (pattern.length < MIN_PATTERN_LENGTH) return 0;

    await db
      .delete(categoryRules)
      .where(and(eq(categoryRules.userId, userId), eq(categoryRules.pattern, pattern)));

    await db.insert(categoryRules).values({
        id: createId(),
        userId,
        pattern,
        categoryId,
    });

    const uncategorized = await db
      .select({ id: transactions.id, payee: transactions.payee })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(accounts.userId, userId), isNull(transactions.categoryId)));

    const ids = uncategorized
      .filter((transaction) => normalizePayee(transaction.payee) === pattern)
      .map((transaction) => transaction.id);

    if (ids.length) {
        await db
          .update(transactions)
          .set({ categoryId })
          .where(inArray(transactions.id, ids));
    }

    return ids.length;
};

// Runs the rules over every uncategorized transaction the user already has.
export const categorizeExisting = async (userId: string) => {
    const uncategorized = await db
      .select({
          id: transactions.id,
          payee: transactions.payee,
          notes: transactions.notes,
          amount: transactions.amount,
          categoryId: transactions.categoryId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(accounts.userId, userId), isNull(transactions.categoryId)));

    const categorized = await autoCategorize(userId, uncategorized);

    // One update per category instead of one per transaction.
    const idsByCategory = new Map<string, string[]>();
    for (const row of categorized) {
        if (!row.categoryId) continue;
        idsByCategory.set(row.categoryId, [...(idsByCategory.get(row.categoryId) ?? []), row.id]);
    }

    for (const [categoryId, ids] of idsByCategory) {
        await db
          .update(transactions)
          .set({ categoryId })
          .where(inArray(transactions.id, ids));
    }

    return {
        categorized: [...idsByCategory.values()].reduce((sum, ids) => sum + ids.length, 0),
        remaining: categorized.filter((row) => !row.categoryId).length,
    };
};

import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const accounts = pgTable("accounts",{
    id: text("id").primaryKey(),
    plaidId: text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
    transactions: many(transactions),
}));

export const categories = pgTable("categories",{
    id: text("id").primaryKey(),
    plaidId: text("plaid_id"),
    name: text("name").notNull(),
    userId: text("user_id").notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
    transactions: many(transactions),
}));

export const insertAccountSchema = createInsertSchema(accounts);

export const insertCategorySchema = createInsertSchema(categories);

export const transactions = pgTable("transactions",{
    id: text("id").primaryKey(),
    amount: integer("amount").notNull(),
    payee: text("payee").notNull(),
    notes: text("notes"),
    date: timestamp("date", { mode: "date" }).notNull(),
    accountId: text("account_id").references(() => accounts.id, {
        onDelete: "cascade",
    }).notNull(),
    categoryId: text("category_id").references(() => categories.id, {
        onDelete: "set null",
    }),
    // ID from a connected bank (Investec's uuid). Null for manual and CSV transactions.
    externalId: text("external_id"),
}, (table) => ({
    // The same bank transaction can't be imported twice into one account. Postgres treats
    // NULLs as distinct, so manual and CSV transactions (externalId null) aren't affected.
    accountExternalIdIdx: uniqueIndex("transactions_account_id_external_id_idx")
      .on(table.accountId, table.externalId),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    account: one(accounts, {
        fields: [transactions.accountId],
        references: [accounts.id],
    }),
    category: one(categories, {
        fields: [transactions.categoryId],
        references: [categories.id],
    }),
}));

// Payee patterns the user has taught the app ("FOOD ZONE" -> Groceries).
// Learned automatically whenever a transaction is given a category.
export const categoryRules = pgTable("category_rules", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    pattern: text("pattern").notNull(),
    categoryId: text("category_id").references(() => categories.id, {
        onDelete: "cascade",
    }).notNull(),
});

// A user's link between a bank account (Investec) and one of their app accounts.
export const bankConnections = pgTable("bank_connections", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    externalAccountName: text("external_account_name").notNull(),
    accountId: text("account_id").references(() => accounts.id, {
        onDelete: "cascade",
    }).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
    // One connection per provider per user for now.
    userProviderIdx: uniqueIndex("bank_connections_user_id_provider_idx")
      .on(table.userId, table.provider),
}));

export const insertTransactionSchema = createInsertSchema(transactions, {
    date: z.coerce.date()
});
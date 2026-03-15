# 💰 Finance SaaS Platform
A full-stack financial management application built with Next.js and Hono.js, enabling users to track accounts, manage transactions, and analyze spending through an interactive dashboard with CSV import capabilities, developed as part of a comprehensive development tutorial.

# 🚀 Key Features
🔐 Secure Authentication: User sign-up, sign-in, and session management for personalized financial data.

📊 Interactive Dashboard: Visual overview with summary cards (balance, income, expenses), interactive charts for income vs. expenses, and pie charts for category breakdowns.

🏦 Account & Category Management: Full CRUD operations for managing financial accounts and transaction categories.

📝 Transaction Tracking: Complete control over financial transactions with the ability to add, edit, delete, and view details.

📤 Bulk CSV Import: Upload bank statements via CSV files with intelligent data mapping and preview before saving.

🔍 Advanced Filtering: Filter dashboard data and transaction lists by date range and specific accounts.

# 🛠 Tech Stack
Framework: Next.js 14 (App Router)

Frontend: React 18, TypeScript, Tailwind CSS, shadcn/ui

API Layer: Hono.js for fast, type-safe edge APIs

Database ORM: Drizzle ORM for type-safe database interactions

Database: Neon (Serverless Postgres)

Authentication: Appwrite

Utilities: Recharts (charts), Papaparse (CSV parsing)

# ⚙️ Setup & Installation
Prerequisites
Node.js (v18 or later)

npm, yarn, or pnpm

A Neon database project (or any Postgres database)

An Appwrite project with credentials

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```


You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

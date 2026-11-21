# 💰 Finance Tracker

> 🚧 **Work in progress.** Authentication and account management are working. Categories, transactions, CSV import and the analytics dashboard are being built next. See the [roadmap](#️-roadmap) for current status.

A full-stack personal finance web app for tracking income and expenses across multiple accounts. Built with Next.js, Hono, Drizzle ORM and Neon PostgreSQL, with authentication handled by Clerk.

---

## ✅ What works today

- 🔐 Sign up, sign in and protected routes with Clerk
- 🏦 Create, view, edit and delete financial accounts
- 🗑️ Bulk delete accounts from a data table
- ⚡ Type-safe REST API built with Hono, running inside Next.js route handlers
- 🗄️ PostgreSQL schema and migrations managed with Drizzle ORM, hosted on Neon

---

## 🗺️ Roadmap

### Core features

- [x] Authentication (Clerk)
- [x] Hono API setup
- [x] Database setup (Drizzle + Neon)
- [x] Accounts: create, read, update, delete
- [x] Accounts: data table with bulk delete
- [X] Categories: create, read, update, delete
- [X] Transactions API
- [X] Transactions form (income / expense toggle)
- [X] Transactions table with search and bulk delete
- [ ] CSV import with preview before saving
- [ ] Summary API
- [ ] Dashboard summary cards
- [ ] Dashboard charts (switchable chart types)
- [ ] Spending breakdown by category
- [ ] Date range and account filters
- [ ] Deploy to Vercel

### Planned extensions (my own additions)

- [ ] Investec Programmable Banking integration (sandbox)
- [ ] CSV import presets for major SA banks (FNB, Capitec, Standard Bank, Absa, Nedbank)
- [ ] Budget planning per category
- [ ] Recurring transactions
- [ ] Financial goals
- [ ] Export reports as PDF
- [ ] Multi-currency support

---

## 🏦 Bank connections

This app is built with South African banks in mind. Popular aggregators like Plaid don't support South African banks, so transactions are brought in two ways:

- **CSV import:** works with any bank that lets you download your transaction history. Columns are mapped during upload, so different bank formats are supported.
- **Investec API (planned):** a direct connection for Investec clients through Investec Programmable Banking, developed against Investec's sandbox.

---

## 🛠️ Tech Stack

| Layer | Tools |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Tables | TanStack Table v8 |
| Forms & validation | React Hook Form, Zod |
| Data fetching | TanStack Query |
| API | Hono |
| Database | Neon PostgreSQL, Drizzle ORM |
| Auth | Clerk |
| Charts (planned) | Recharts |
| CSV parsing (planned) | PapaParse |

---

## 🏗️ Architecture

```
Client (Next.js + React + TanStack Query)
            │
            ▼
   Hono API (app/api/[[...route]])
            │
            ▼
       Drizzle ORM
            │
            ▼
     Neon PostgreSQL
```

Each feature lives in its own folder under `features/`, containing its API hooks (queries and mutations) and UI components such as sheets and forms. The API routes are defined with Hono and share types with the client through Hono's RPC client, so request and response shapes are checked end to end.

---

## 📂 Project Structure

```
app/            Next.js routes, layouts and the Hono API entry point
components/     Shared UI components (shadcn/ui and custom)
db/             Drizzle schema and database client
drizzle/        Generated SQL migrations
features/       Feature modules (accounts, and later categories and transactions)
lib/            Utilities and the typed Hono client
providers/      React context providers (query client, sheets)
public/         Static assets
scripts/        Helper scripts (e.g. seeding)
proxy.ts        Clerk route protection (formerly middleware.ts)
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 20.19 or later (current LTS recommended)
- A [Neon](https://neon.tech/) PostgreSQL database
- A [Clerk](https://clerk.com/) application

### 1. Clone and install

```bash
git clone https://github.com/wantedProgrammer/finance-tracker.git
cd finance-tracker
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

DATABASE_URL=your_neon_connection_string

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run database migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

To browse the database in your browser:

```bash
npx drizzle-kit studio
```

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in to get started.

---

## 📸 Screenshots

Screenshots will be added once the dashboard is complete.

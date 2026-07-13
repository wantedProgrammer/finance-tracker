# 💰 Finance SaaS Platform

A modern full-stack financial management application built with **Next.js 14**, **Hono.js**, **Drizzle ORM**, and **Neon PostgreSQL**. 
Users can securely manage financial accounts, track transactions, visualize spending patterns, and import transaction data through an intuitive dashboard.

---

## ✨ Features

- 🔐 Secure authentication with Clerk
- 📊 Interactive financial dashboard
- 💰 Track income and expenses
- 🏦 Manage multiple financial accounts
- 🗂️ Create and organize transaction categories
- 📝 Full CRUD operations for transactions
- 📈 Data visualization with interactive charts
- 🥧 Spending breakdown by category
- 📅 Filter transactions by date range
- 🏛️ Filter data by account
- 📤 Import transactions from CSV files
- 👀 Preview imported data before saving
- 📱 Fully responsive design
- ⚡ Fast and type-safe API using Hono.js

---

## 🛠️ Tech Stack

### Frontend

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod

### Backend

- Hono.js
- Drizzle ORM
- Neon PostgreSQL

### Authentication

- Clerk

### Data Visualization

- Recharts

### CSV Processing

- PapaParse

### Development Tools

- ESLint
- Prettier
- Git
- GitHub

---

## 🏗️ Architecture

```
Client (Next.js + React)
            │
            ▼
      Hono.js API
            │
            ▼
      Drizzle ORM
            │
            ▼
     Neon PostgreSQL
```

---

## 📸 Screenshots

> Screenshots coming soon.

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- npm, pnpm, yarn, or bun
- A Neon PostgreSQL database
- A Clerk account

---

### Clone the repository

```bash
git clone https://github.com/wantedProgrammer/finance-tracker.git

cd finance-tracker
```

---

### Install dependencies

```bash
npm install
```

or

```bash
pnpm install
```

---

## 📂 Project Structure

```
app/
components/
features/
hooks/
lib/
db/
drizzle/
public/
```

---

## 🎯 Learning Objectives

This project was completed to gain practical experience with:

- Building full-stack applications using Next.js
- Designing type-safe APIs with Hono.js
- Managing relational databases using Drizzle ORM
- Implementing secure authentication with Clerk
- Working with PostgreSQL databases
- Building reusable UI components
- Data visualization using charts
- Importing and validating CSV data
- Modern TypeScript development

---

## 🚀 Future Improvements

- Budget planning
- Recurring transactions
- Financial goals
- Email notifications
- Mobile application
- Multi-currency support
- Receipt image uploads
- AI-powered spending insights
- Export reports as PDF

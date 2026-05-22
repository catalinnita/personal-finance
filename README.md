# Personal Finance App

AI-powered personal finance tracker — upload bank statements, auto-categorize transactions with Claude, and visualize spending across budgets, categories, timelines, and income. Built with Next.js, Supabase, and Google OAuth.

## Features

- **Google Authentication** - Secure login with Google OAuth
- **Statement Upload** - Upload bank statements (CSV/TXT) and parse transactions with AI
- **Smart Categorization** - Claude AI automatically categorizes transactions
- **Transaction Management** - View, edit, and delete transactions
- **Balance Dashboard** - Yearly and monthly income, expenses, and savings overview

## Setup

### 1. Environment Variables

Create a `.env` file with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase-schema.sql` in the SQL Editor
3. Enable Google OAuth in Authentication > Providers > Google
4. Add your redirect URL: `http://localhost:3000/auth/callback`

### 3. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

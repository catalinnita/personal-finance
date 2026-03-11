# Personal Finance App - Technical Specifications

## Overview

A personal finance management application for tracking income, expenses, and spending patterns. Users can upload bank statements, categorize transactions, and view financial reports.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 (App Router)
- **React**: 19.2.3
- **Styling**: Tailwind CSS v4 with TailAdmin theme
- **Icons**: Lucide React
- **TypeScript**: v5

### Backend
- **Runtime**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)
- **AI**: Anthropic Claude API (statement parsing)

### Deployment
- **Hosting**: Vercel
- **Database**: Supabase Cloud

---

## Database Schema

### Tables

#### `transactions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| date | DATE | Transaction date |
| category | TEXT | Category name |
| amount | DECIMAL(12,2) | Transaction amount |
| description | TEXT | Transaction description |
| type | TEXT | 'income' or 'expense' |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `categories`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| name | TEXT | Category name (unique per user) |
| type | TEXT | 'income' or 'expense' |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `category_mappings`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| description_pattern | TEXT | Transaction description (unique per user) |
| category | TEXT | Mapped category name |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `user_settings`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users (unique) |
| currency | TEXT | Currency code (default: 'USD') |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Row Level Security (RLS)
All tables have RLS enabled. Users can only access their own data via policies checking `auth.uid() = user_id`.

---

## API Endpoints

### Transactions
- `GET /api/transactions` - Fetch all user transactions (batched for >1000 rows)
- `POST /api/transactions` - Create transactions (with duplicate detection)
- `PUT /api/transactions/[id]` - Update a transaction
- `DELETE /api/transactions/[id]` - Delete a transaction

### Categories
- `GET /api/categories` - Fetch user's custom categories
- `POST /api/categories` - Create a category
- `PUT /api/categories/[id]` - Update a category
- `DELETE /api/categories/[id]` - Delete a category

### Category Mappings
- `GET /api/category-mappings` - Fetch all mappings
- `POST /api/category-mappings` - Create/update a mapping (upsert)
- `DELETE /api/category-mappings/[id]` - Delete a mapping

### Statement Parsing
- `POST /api/parse-statement` - Parse uploaded statement file using Claude AI
  - Accepts: CSV, TXT, PDF
  - Returns: Array of parsed transactions with AI-generated categories

### Settings
- `GET /api/settings` - Fetch user settings and available currencies
- `PUT /api/settings` - Update user settings (currency)

---

## Application Pages

### Data Section

#### Upload Statements (`/upload`)
- Multi-file upload support (CSV, TXT, PDF)
- AI-powered statement parsing using Claude
- Preview parsed transactions before saving
- Duplicate detection (by date, description, amount)
- Progress indicator for multi-file parsing

#### Transactions (`/transactions`)
- Paginated transaction list
- Filter by year and month
- Inline editing (category, amount, description)
- Delete transactions
- Color-coded income (green) / expense (red)

### Manage Section

#### Manage Categories (`/manage-categories`)
- Create custom categories (income/expense type)
- Edit category name and type
- Delete categories
- 3-column responsive grid layout

#### Mappings (`/mappings`)
- Drag-and-drop interface for category assignment
- Category filter with color-coded buttons
- Unmapped descriptions alert section
- Search functionality
- Visual mapping count per category

### Reporting Section

#### Balance (`/balance`)
- Year selector
- Summary cards: Total Income, Total Expenses, Net Savings
- Monthly breakdown table
- Trend indicators (positive/negative savings)

#### Categories (`/categories`)
- Year selector
- Pie chart visualization of expenses by category
- Category breakdown with amounts and percentages
- Sorted by spending amount

#### Timeline (`/timeline`)
- Year selector
- Category filter (multi-select)
- Bar charts showing monthly spending evolution per category
- Trend indicators (% change vs previous month)
- Hover tooltips with exact amounts

### Settings (`/settings`)
- Currency selector (50+ currencies)
- Auto-save on change

---

## UI/UX Features

### Theme
- TailAdmin-based design system
- Dark/Light mode toggle (persisted in localStorage)
- Responsive design (mobile, tablet, desktop)
- Custom color palette: brand, success, error, warning

### Sidebar Navigation
- Collapsible sidebar (hover to expand)
- Grouped sections: Data, Manage, Reporting
- Mobile-friendly with hamburger menu
- Active state highlighting

### Header
- Settings link
- Dark/Light mode toggle
- Logout button

---

## Authentication Flow

1. User visits `/login`
2. Clicks "Sign in with Google"
3. Redirected to Google OAuth
4. Callback to `/auth/callback`
5. Session created via Supabase
6. Redirected to `/upload` (dashboard)

### Middleware
- Protected routes require authentication
- Unauthenticated users redirected to `/login`
- Authenticated users on `/login` redirected to `/upload`

---

## Key Features

### Statement Parsing (Claude AI)
- Extracts: date, description, amount, type
- Auto-categorizes transactions using existing mappings
- Falls back to AI-generated categories for new descriptions
- Context includes user's existing categories and mappings

### Duplicate Detection
- Checks existing transactions before insert
- Matches on: date + description + amount
- Reports count of skipped duplicates

### Category Mapping System
- Maps transaction descriptions to categories
- Auto-applies to future transactions with same description
- Drag-and-drop reassignment
- Bulk category updates

### Currency Formatting
- User-selectable currency
- `useCurrency` hook for consistent formatting
- Supports 50+ world currencies

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
ANTHROPIC_API_KEY=<claude-api-key>
```

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:check     # Check database migrations
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed initial data
npm run db:seed-mappings  # Generate mappings from transactions
```

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── balance/
│   │   ├── categories/
│   │   ├── manage-categories/
│   │   ├── mappings/
│   │   ├── settings/
│   │   ├── timeline/
│   │   ├── transactions/
│   │   ├── upload/
│   │   └── layout.tsx
│   ├── api/                # API routes
│   │   ├── categories/
│   │   ├── category-mappings/
│   │   ├── parse-statement/
│   │   ├── settings/
│   │   └── transactions/
│   ├── auth/
│   │   └── callback/
│   ├── login/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Sidebar.tsx
│   └── TransactionModal.tsx
├── context/
│   ├── SidebarContext.tsx
│   └── ThemeContext.tsx
├── hooks/
│   └── useCurrency.ts
├── lib/
│   └── supabase/
│       ├── client.ts
│       └── server.ts
└── types/
    └── database.ts
```

---

## Default Categories

```
Salary, Groceries, Utilities, Entertainment, Transportation,
Healthcare, Shopping, Dining, Subscriptions, Transfer,
Investment, Rent, Insurance, Education, Travel, Other
```
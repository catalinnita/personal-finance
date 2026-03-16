import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const databaseUrl = process.env.DATABASE_URL

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdd these to your .env file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// Execute SQL via direct postgres connection
async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  if (!databaseUrl) {
    return { success: false, error: 'DATABASE_URL not configured' }
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  
  try {
    await client.connect()
    await client.query(sql)
    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error }
  } finally {
    await client.end()
  }
}

const MIGRATIONS = [
  {
    name: 'Create user_settings table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
        currency TEXT NOT NULL DEFAULT 'USD',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'Create user_settings index',
    sql: `CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);`
  },
  {
    name: 'Enable user_settings RLS',
    sql: `ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'User_settings SELECT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can view their own settings"
          ON user_settings FOR SELECT USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'User_settings INSERT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can insert their own settings"
          ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'User_settings UPDATE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can update their own settings"
          ON user_settings FOR UPDATE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Create categories table',
    sql: `
      CREATE TABLE IF NOT EXISTS categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, name)
      );
    `
  },
  {
    name: 'Create categories index',
    sql: `CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);`
  },
  {
    name: 'Enable categories RLS',
    sql: `ALTER TABLE categories ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Categories SELECT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can view their own categories"
          ON categories FOR SELECT USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Categories INSERT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can insert their own categories"
          ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Categories UPDATE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can update their own categories"
          ON categories FOR UPDATE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Categories DELETE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can delete their own categories"
          ON categories FOR DELETE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Create category_mappings table',
    sql: `
      CREATE TABLE IF NOT EXISTS category_mappings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        description_pattern TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, description_pattern)
      );
    `
  },
  {
    name: 'Create category_mappings index',
    sql: `CREATE INDEX IF NOT EXISTS idx_category_mappings_user_id ON category_mappings(user_id);`
  },
  {
    name: 'Enable category_mappings RLS',
    sql: `ALTER TABLE category_mappings ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Category_mappings SELECT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can view their own category_mappings"
          ON category_mappings FOR SELECT USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Category_mappings INSERT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can insert their own category_mappings"
          ON category_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Category_mappings UPDATE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can update their own category_mappings"
          ON category_mappings FOR UPDATE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Category_mappings DELETE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can delete their own category_mappings"
          ON category_mappings FOR DELETE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Remove category column from transactions',
    sql: `ALTER TABLE transactions DROP COLUMN IF EXISTS category;`
  },
  {
    name: 'Add category_id column to category_mappings',
    sql: `ALTER TABLE category_mappings ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE CASCADE;`
  },
  {
    name: 'Populate category_id from category text',
    sql: `
      UPDATE category_mappings cm
      SET category_id = c.id
      FROM categories c
      WHERE cm.category = c.name AND cm.user_id = c.user_id AND cm.category_id IS NULL;
    `
  },
  {
    name: 'Delete orphaned mappings without matching category',
    sql: `DELETE FROM category_mappings WHERE category_id IS NULL;`
  },
  {
    name: 'Drop category text column from category_mappings',
    sql: `ALTER TABLE category_mappings DROP COLUMN IF EXISTS category;`
  },
  {
    name: 'Create category_mappings category_id index',
    sql: `CREATE INDEX IF NOT EXISTS idx_category_mappings_category_id ON category_mappings(category_id);`
  },
  {
    name: 'Add highlight_threshold to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS highlight_threshold DECIMAL(12, 2) DEFAULT 500;`
  },
  {
    name: 'Add moving_average_period to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS moving_average_period INTEGER DEFAULT 6;`
  },
  {
    name: 'Add expense_type to categories',
    sql: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS expense_type VARCHAR(20) DEFAULT 'variable';`
  },
  {
    name: 'Add budget_group to categories for 50/30/20 rule',
    sql: `ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_group VARCHAR(20) DEFAULT 'needs' CHECK (budget_group IN ('needs', 'wants', 'savings'));`
  },
  {
    name: 'Create budgets table',
    sql: `
      CREATE TABLE IF NOT EXISTS budgets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, category_id, effective_from)
      );
    `
  },
  {
    name: 'Create budgets indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_effective_from ON budgets(effective_from);
    `
  },
  {
    name: 'Enable budgets RLS',
    sql: `ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Budgets SELECT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can view their own budgets"
          ON budgets FOR SELECT USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Budgets INSERT policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can insert their own budgets"
          ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Budgets UPDATE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can update their own budgets"
          ON budgets FOR UPDATE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
  {
    name: 'Budgets DELETE policy',
    sql: `
      DO $$ BEGIN
        CREATE POLICY "Users can delete their own budgets"
          ON budgets FOR DELETE USING (auth.uid() = user_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `
  },
]

async function runMigrations() {
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not configured.')
    console.error('\nAdd DATABASE_URL to your .env file.')
    console.error('You can find it in Supabase Dashboard → Settings → Database → Connection string → URI')
    process.exit(1)
  }

  console.log('🚀 Running database migrations...\n')

  let successCount = 0
  let errorCount = 0

  for (const migration of MIGRATIONS) {
    process.stdout.write(`  ${migration.name}... `)
    
    const result = await executeSql(migration.sql)
    
    if (result.success) {
      console.log('✅')
      successCount++
    } else {
      console.log(`❌ ${result.error}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`)
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some migrations failed. Check the errors above.')
  } else {
    console.log('\n✅ All migrations completed successfully!')
  }
}

// Check tables exist
async function checkTables() {
  console.log('📋 Checking table status...\n')

  const tables = ['categories', 'category_mappings']
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    
    if (error?.message.includes('does not exist')) {
      console.log(`  ${table}: ❌ Missing`)
    } else {
      console.log(`  ${table}: ✅ Exists`)
    }
  }
  console.log('')
}

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Transportation', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Dining', type: 'expense' },
  { name: 'Subscriptions', type: 'expense' },
  { name: 'Transfer', type: 'expense' },
  { name: 'Investment', type: 'income' },
  { name: 'Rent', type: 'expense' },
  { name: 'Insurance', type: 'expense' },
  { name: 'Education', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Other', type: 'expense' },
]

async function seedCategories() {
  console.log('🌱 Seeding default categories for all users...\n')

  // Get all users from auth.users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError.message)
    return
  }

  if (!users?.users?.length) {
    console.log('  No users found.')
    return
  }

  console.log(`  Found ${users.users.length} user(s)\n`)

  for (const user of users.users) {
    process.stdout.write(`  User ${user.email || user.id}... `)
    
    // Check if user already has categories
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    
    if (existing && existing.length > 0) {
      console.log('⏭️  (already has categories)')
      continue
    }

    // Insert default categories for this user
    const categoriesToInsert = DEFAULT_CATEGORIES.map(cat => ({
      user_id: user.id,
      name: cat.name,
      type: cat.type,
    }))

    const { error: insertError } = await supabase
      .from('categories')
      .insert(categoriesToInsert)

    if (insertError) {
      console.log(`❌ ${insertError.message}`)
    } else {
      console.log(`✅ (${DEFAULT_CATEGORIES.length} categories)`)
    }
  }

  console.log('\n✅ Seeding complete!')
}

async function seedMappings() {
  console.log('🌱 Seeding category mappings from existing transactions...\n')

  // Get all users from auth.users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError.message)
    return
  }

  if (!users?.users?.length) {
    console.log('  No users found.')
    return
  }

  console.log(`  Found ${users.users.length} user(s)\n`)

  for (const user of users.users) {
    process.stdout.write(`  User ${user.email || user.id}... `)
    
    // Get unique description-category pairs from transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('description, category')
      .eq('user_id', user.id)
    
    if (txError) {
      console.log(`❌ ${txError.message}`)
      continue
    }

    if (!transactions || transactions.length === 0) {
      console.log('⏭️  (no transactions)')
      continue
    }

    // Get unique description-category mappings
    const mappingsMap = new Map<string, string>()
    for (const tx of transactions) {
      if (tx.description && tx.category && !mappingsMap.has(tx.description)) {
        mappingsMap.set(tx.description, tx.category)
      }
    }

    if (mappingsMap.size === 0) {
      console.log('⏭️  (no mappings to create)')
      continue
    }

    // Check existing mappings
    const { data: existingMappings } = await supabase
      .from('category_mappings')
      .select('description_pattern')
      .eq('user_id', user.id)
    
    const existingPatterns = new Set(existingMappings?.map(m => m.description_pattern) || [])

    // Filter out already existing mappings
    const newMappings = Array.from(mappingsMap.entries())
      .filter(([desc]) => !existingPatterns.has(desc))
      .map(([desc, cat]) => ({
        user_id: user.id,
        description_pattern: desc,
        category: cat,
      }))

    if (newMappings.length === 0) {
      console.log('⏭️  (all mappings exist)')
      continue
    }

    const { error: insertError } = await supabase
      .from('category_mappings')
      .insert(newMappings)

    if (insertError) {
      console.log(`❌ ${insertError.message}`)
    } else {
      console.log(`✅ (${newMappings.length} mappings)`)
    }
  }

  console.log('\n✅ Mappings seeding complete!')
}

async function main() {
  const command = process.argv[2]

  if (command === 'check') {
    await checkTables()
  } else if (command === 'run') {
    await runMigrations()
  } else if (command === 'seed') {
    await seedCategories()
  } else if (command === 'seed-mappings') {
    await seedMappings()
  } else {
    console.log('Usage: npx tsx scripts/migrate.ts <command>\n')
    console.log('Commands:')
    console.log('  check         - Check if tables exist')
    console.log('  run           - Run migrations')
    console.log('  seed          - Seed default categories for all users')
    console.log('  seed-mappings - Seed category mappings from existing transactions')
  }
}

main().catch(console.error)

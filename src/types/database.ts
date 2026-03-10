export type Transaction = {
  id: string
  user_id: string
  date: string
  category: string
  amount: number
  description: string
  type: 'income' | 'expense'
  created_at: string
  updated_at: string
}

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>
export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>

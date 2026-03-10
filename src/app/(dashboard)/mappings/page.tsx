'use client'

import { useState, useEffect, DragEvent } from 'react'
import { Loader2, GripVertical, X } from 'lucide-react'

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
}

type CategoryMapping = {
  id: string
  description_pattern: string
  category: string
}

const DEFAULT_CATEGORIES = [
  'Salary', 'Groceries', 'Utilities', 'Entertainment', 'Transportation',
  'Healthcare', 'Shopping', 'Dining', 'Subscriptions', 'Transfer',
  'Investment', 'Rent', 'Insurance', 'Education', 'Travel', 'Other'
]

export default function MappingsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [mappings, setMappings] = useState<CategoryMapping[]>([])
  const [loading, setLoading] = useState(true)
  
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [categoriesRes, mappingsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/category-mappings'),
      ])
      
      const categoriesData = await categoriesRes.json()
      const mappingsData = await mappingsRes.json()
      
      if (categoriesData.categories) setCategories(categoriesData.categories)
      if (mappingsData.mappings) setMappings(mappingsData.mappings)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMapping = async (descriptionPattern: string, newCategory: string) => {
    try {
      const response = await fetch('/api/category-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description_pattern: descriptionPattern, 
          category: newCategory 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMappings(prev => [
          ...prev.filter(m => m.description_pattern !== descriptionPattern), 
          data.mapping
        ])
      }
    } catch (error) {
      console.error('Error updating mapping:', error)
    }
  }

  const handleDeleteMapping = async (id: string) => {
    try {
      const response = await fetch(`/api/category-mappings/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setMappings(mappings.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error('Error deleting mapping:', error)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, description: string) => {
    setDraggedItem(description)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, category: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCategory(category)
  }

  const handleDragLeave = () => {
    setDragOverCategory(null)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetCategory: string) => {
    e.preventDefault()
    setDragOverCategory(null)
    
    if (draggedItem && targetCategory) {
      await handleUpdateMapping(draggedItem, targetCategory)
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverCategory(null)
  }

  // Get all category names (custom + default)
  const allCategoryNames = [
    ...new Set([
      ...categories.map(c => c.name),
      ...DEFAULT_CATEGORIES
    ])
  ].sort()

  // Group mappings by category
  const mappingsByCategory: Record<string, CategoryMapping[]> = {}
  allCategoryNames.forEach(cat => {
    mappingsByCategory[cat] = mappings.filter(m => m.category === cat)
  })

  // Filter categories based on search
  const filteredCategories = searchTerm
    ? allCategoryNames.filter(cat => 
        cat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mappingsByCategory[cat]?.some(m => 
          m.description_pattern.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : allCategoryNames

  // Show all categories (for drag-drop targets), filter by search if active
  const categoriesToShow = searchTerm
    ? filteredCategories
    : allCategoryNames

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Description Mappings</h1>
          <p className="text-slate-400 text-sm mt-1">
            Drag descriptions between categories to reassign them
          </p>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search descriptions..."
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {mappings.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">No mappings yet. Run <code className="bg-slate-700 px-2 py-1 rounded">npm run db:seed-mappings</code> to populate from transactions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categoriesToShow.map(category => (
            <div
              key={category}
              className={`bg-slate-800 rounded-xl p-4 min-h-[200px] transition-colors ${
                dragOverCategory === category ? 'bg-blue-600/20 ring-2 ring-blue-500' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, category)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category)}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white truncate">{category}</h3>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                  {mappingsByCategory[category]?.length || 0}
                </span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {mappingsByCategory[category]?.map(mapping => (
                  <div
                    key={mapping.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, mapping.description_pattern)}
                    onDragEnd={handleDragEnd}
                    className={`group flex items-center gap-2 p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                      draggedItem === mapping.description_pattern ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-300 truncate flex-1" title={mapping.description_pattern}>
                      {mapping.description_pattern}
                    </span>
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

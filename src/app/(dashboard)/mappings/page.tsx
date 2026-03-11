'use client'

import { useState, useEffect, DragEvent } from 'react'
import { Loader2, GripVertical, X, AlertCircle, Sparkles } from 'lucide-react'

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
}

type CategoryMapping = {
  id: string
  description_pattern: string
  category_id: string
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
  const [unmappedDescriptions, setUnmappedDescriptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnmapped, setShowUnmapped] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [identifying, setIdentifying] = useState(false)
  const [identifyProgress, setIdentifyProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [categoriesRes, mappingsRes, transactionsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/category-mappings'),
        fetch('/api/transactions'),
      ])
      
      const categoriesData = await categoriesRes.json()
      const mappingsData = await mappingsRes.json()
      const transactionsData = await transactionsRes.json()
      
      if (categoriesData.categories) setCategories(categoriesData.categories)
      if (mappingsData.mappings) setMappings(mappingsData.mappings)
      
      // Find unmapped descriptions
      if (transactionsData.transactions && mappingsData.mappings) {
        const mappedPatterns = new Set(mappingsData.mappings.map((m: CategoryMapping) => m.description_pattern))
        const allDescriptions = [...new Set(transactionsData.transactions.map((t: { description: string }) => t.description))] as string[]
        const unmapped = allDescriptions.filter(d => !mappedPatterns.has(d))
        setUnmappedDescriptions(unmapped.sort())
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMapping = async (descriptionPattern: string, categoryId: string) => {
    try {
      const response = await fetch('/api/category-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description_pattern: descriptionPattern, 
          category_id: categoryId 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMappings(prev => [
          ...prev.filter(m => m.description_pattern !== descriptionPattern), 
          data.mapping
        ])
        // Remove from unmapped if it was there
        setUnmappedDescriptions(prev => prev.filter(d => d !== descriptionPattern))
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

  const handleIdentifyWithAI = async () => {
    if (unmappedDescriptions.length === 0) return
    
    setIdentifying(true)
    const batchSize = 20
    const total = unmappedDescriptions.length
    setIdentifyProgress({ current: 0, total })
    
    try {
      // Process in batches to avoid token limits
      for (let i = 0; i < total; i += batchSize) {
        const batch = unmappedDescriptions.slice(i, i + batchSize)
        setIdentifyProgress({ current: Math.min(i + batchSize, total), total })
        
        const response = await fetch('/api/identify-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptions: batch }),
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Create mappings for each identified category
          for (const result of data.results) {
            if (result.description && result.category_id) {
              await handleUpdateMapping(result.description, result.category_id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error identifying categories:', error)
    } finally {
      setIdentifying(false)
      setIdentifyProgress({ current: 0, total: 0 })
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

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetCategoryId: string) => {
    e.preventDefault()
    setDragOverCategory(null)
    
    if (draggedItem && targetCategoryId) {
      await handleUpdateMapping(draggedItem, targetCategoryId)
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverCategory(null)
  }

  // Group mappings by category_id
  const mappingsByCategoryId: Record<string, CategoryMapping[]> = {}
  categories.forEach(cat => {
    mappingsByCategoryId[cat.id] = mappings.filter(m => m.category_id === cat.id)
  })

  // Only show categories that have mappings
  const categoriesWithMappings = categories.filter(cat => 
    mappingsByCategoryId[cat.id]?.length > 0
  )

  // Filter categories based on search and selection
  const filteredCategories = categoriesWithMappings.filter(cat => {
    const matchesSearch = !searchTerm || 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mappingsByCategoryId[cat.id]?.some(m => 
        m.description_pattern.toLowerCase().includes(searchTerm.toLowerCase())
      )
    const matchesSelection = selectedCategories.length === 0 || selectedCategories.includes(cat.id)
    return matchesSearch && matchesSelection
  })

  const categoriesToShow = filteredCategories

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-brand-500',
      'bg-success-500',
      'bg-error-500',
      'bg-warning-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
    ]
    return colors[index % colors.length]
  }

  const getCategoryBorderColor = (index: number) => {
    const colors = [
      'border-brand-500',
      'border-success-500',
      'border-error-500',
      'border-warning-500',
      'border-purple-500',
      'border-pink-500',
      'border-cyan-500',
      'border-orange-500',
      'border-teal-500',
      'border-indigo-500',
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Description Mappings</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Drag descriptions between categories to reassign them
          </p>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search descriptions..."
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-64"
        />
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Filter by category:</p>
        <div className="flex flex-wrap gap-2">
          {categoriesWithMappings.map((category, index) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2 ${
                selectedCategories.includes(category.id)
                  ? `${getCategoryColor(index)} text-white border-transparent`
                  : selectedCategories.length === 0
                    ? `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent`
                    : `bg-transparent ${getCategoryBorderColor(index)} text-gray-700 dark:text-gray-300`
              }`}
            >
              {category.name}
              <span className="ml-1.5 text-xs opacity-70">({mappingsByCategoryId[category.id]?.length || 0})</span>
            </button>
          ))}
        </div>
        {selectedCategories.length > 0 && (
          <button
            onClick={() => setSelectedCategories([])}
            className="mt-3 text-sm text-brand-500 hover:text-brand-600"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Unmapped Descriptions Section */}
      {unmappedDescriptions.length > 0 && showUnmapped && (
        <div className="bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-warning-500" />
              <h2 className="text-lg font-semibold text-warning-600 dark:text-warning-400">
                Unmapped Descriptions ({unmappedDescriptions.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleIdentifyWithAI}
                disabled={identifying || unmappedDescriptions.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {identifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Identifying {identifyProgress.current}/{identifyProgress.total}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Identify with AI
                  </>
                )}
              </button>
              <button
                onClick={() => setShowUnmapped(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
              >
                Hide
              </button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            These descriptions don&apos;t have a category mapping. Drag them to a category below.
          </p>
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
            {unmappedDescriptions
              .filter(d => !searchTerm || d.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(description => (
                <div
                  key={description}
                  draggable
                  onDragStart={(e) => handleDragStart(e, description)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg cursor-grab active:cursor-grabbing transition-all text-sm ${
                    draggedItem === description ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">{description}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {!showUnmapped && unmappedDescriptions.length > 0 && (
        <button
          onClick={() => setShowUnmapped(true)}
          className="mb-6 flex items-center gap-2 text-warning-500 hover:text-warning-400 text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          Show {unmappedDescriptions.length} unmapped descriptions
        </button>
      )}

      {mappings.length === 0 && unmappedDescriptions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <p className="text-gray-500 dark:text-gray-400">No mappings yet. Run <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">npm run db:seed-mappings</code> to populate from transactions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categoriesToShow.map(category => (
            <div
              key={category.id}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 min-h-[200px] transition-colors border border-gray-200 dark:border-gray-700 shadow-theme-sm ${
                dragOverCategory === category.id ? 'bg-brand-50 dark:bg-brand-500/20 ring-2 ring-brand-500' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.id)}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{category.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {mappingsByCategoryId[category.id]?.length || 0}
                </span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {mappingsByCategoryId[category.id]?.map((mapping: CategoryMapping) => (
                  <div
                    key={mapping.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, mapping.description_pattern)}
                    onDragEnd={handleDragEnd}
                    className={`group flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                      draggedItem === mapping.description_pattern ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1" title={mapping.description_pattern}>
                      {mapping.description_pattern}
                    </span>
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-error-500 transition-opacity"
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

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, FileText, Check, Loader2, AlertCircle, StopCircle } from 'lucide-react'
import { STORAGE_KEY_UPLOAD } from '@/config/constants'
import { CloseButton } from '../../../components/CloseButton'

type ParsedTransaction = {
  date: string
  amount: number
  description: string
  category: string
  type: 'income' | 'expense'
}

type FileStatus = 'pending' | 'parsing' | 'parsed' | 'checking' | 'saving' | 'completed' | 'error' | 'cancelled'

type FileProgress = {
  name: string
  status: FileStatus
  transactions: ParsedTransaction[]
  saved: number
  duplicates: number
  error?: string
}

type ProcessState = {
  files: FileProgress[]
  isProcessing: boolean
  currentIndex: number
  cancelled: boolean
}

const STORAGE_KEY = STORAGE_KEY_UPLOAD

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [processState, setProcessState] = useState<ProcessState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const cancelledRef = useRef(false)
  const fileContentsRef = useRef<Map<string, string>>(new Map())

  // Load persisted state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const state = JSON.parse(saved) as ProcessState
        if (state.isProcessing && !state.cancelled) {
          setProcessState(state)
          // Resume processing if it was interrupted
          if (state.currentIndex < state.files.length) {
            resumeProcessing(state)
          }
        } else if (state.files.some(f => f.status === 'completed')) {
          // Show completed state
          setProcessState(state)
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Persist state changes
  useEffect(() => {
    if (processState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(processState))
    }
  }, [processState])

  const resumeProcessing = async (state: ProcessState) => {
    setIsProcessing(true)
    cancelledRef.current = false
    
    // Continue from where we left off
    for (let i = state.currentIndex; i < state.files.length; i++) {
      if (cancelledRef.current) break
      
      const fileProgress = state.files[i]
      if (fileProgress.status === 'completed' || fileProgress.status === 'error') continue
      
      // We can't resume file parsing without the actual file content
      // Mark as needing re-upload
      updateFileStatus(i, 'error', { error: 'Page was refreshed. Please re-select this file.' })
    }
    
    setIsProcessing(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles)
      setProcessState(null)
      localStorage.removeItem(STORAGE_KEY)
      cancelledRef.current = false
      
      // Store file contents for potential resume
      selectedFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = (e) => {
          fileContentsRef.current.set(file.name, e.target?.result as string)
        }
        reader.readAsText(file)
      })
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    if (newFiles.length === 0) {
      setProcessState(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const updateFileStatus = useCallback((index: number, status: FileStatus, updates: Partial<FileProgress> = {}) => {
    setProcessState(prev => {
      if (!prev) return prev
      const newFiles = [...prev.files]
      newFiles[index] = { ...newFiles[index], status, ...updates }
      return { ...prev, files: newFiles, currentIndex: index }
    })
  }, [])

  const handleProcess = async () => {
    if (files.length === 0) return

    cancelledRef.current = false
    setIsProcessing(true)

    // Initialize process state
    const initialState: ProcessState = {
      files: files.map(f => ({
        name: f.name,
        status: 'pending' as FileStatus,
        transactions: [],
        saved: 0,
        duplicates: 0,
      })),
      isProcessing: true,
      currentIndex: 0,
      cancelled: false,
    }
    setProcessState(initialState)

    // Process each file sequentially
    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) {
        updateFileStatus(i, 'cancelled')
        continue
      }

      const file = files[i]
      
      try {
        // Step 1: Parse
        updateFileStatus(i, 'parsing')
        
        const formData = new FormData()
        formData.append('file', file)

        const parseResponse = await fetch('/api/parse-statement', {
          method: 'POST',
          body: formData,
        })

        if (cancelledRef.current) {
          updateFileStatus(i, 'cancelled')
          continue
        }

        const parseData = await parseResponse.json()
        
        if (parseData.error) {
          updateFileStatus(i, 'error', { error: parseData.error })
          continue
        }

        const transactions = parseData.transactions || []
        updateFileStatus(i, 'parsed', { transactions })

        if (transactions.length === 0) {
          updateFileStatus(i, 'completed', { saved: 0, duplicates: 0 })
          continue
        }

        // Step 2: Check duplicates & Save
        updateFileStatus(i, 'saving')

        if (cancelledRef.current) {
          updateFileStatus(i, 'cancelled')
          continue
        }

        const saveResponse = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions }),
        })

        const saveData = await saveResponse.json()

        if (saveResponse.ok) {
          updateFileStatus(i, 'completed', {
            saved: saveData.saved || saveData.transactions?.length || 0,
            duplicates: saveData.duplicates || 0,
          })
        } else {
          updateFileStatus(i, 'error', { error: saveData.error || 'Failed to save' })
        }

      } catch (err) {
        console.error(`Error processing ${file.name}:`, err)
        updateFileStatus(i, 'error', { error: 'Network error' })
      }
    }

    setIsProcessing(false)
    setProcessState(prev => prev ? { ...prev, isProcessing: false } : null)
  }

  const handleCancel = () => {
    cancelledRef.current = true
    setProcessState(prev => prev ? { ...prev, cancelled: true, isProcessing: false } : null)
    setIsProcessing(false)
  }

  const handleReset = () => {
    setFiles([])
    setProcessState(null)
    localStorage.removeItem(STORAGE_KEY)
    cancelledRef.current = false
  }

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
      case 'parsing':
      case 'checking':
      case 'saving':
        return <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
      case 'parsed':
        return <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
      case 'completed':
        return <div className="w-5 h-5 rounded-full bg-success-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error-500" />
      case 'cancelled':
        return <StopCircle className="w-5 h-5 text-warning-500" />
      default:
        return null
    }
  }

  const getStatusText = (file: FileProgress) => {
    switch (file.status) {
      case 'pending':
        return 'Waiting...'
      case 'parsing':
        return 'Parsing document...'
      case 'parsed':
        return `Parsed ${file.transactions.length} transactions`
      case 'checking':
        return 'Checking for duplicates...'
      case 'saving':
        return 'Saving to database...'
      case 'completed':
        return `Saved ${file.saved} transactions${file.duplicates > 0 ? `, ${file.duplicates} duplicates skipped` : ''}`
      case 'error':
        return file.error || 'Error'
      case 'cancelled':
        return 'Cancelled'
      default:
        return ''
    }
  }

  const totalStats = processState?.files.reduce(
    (acc, f) => ({
      saved: acc.saved + f.saved,
      duplicates: acc.duplicates + f.duplicates,
      transactions: acc.transactions + f.transactions.length,
    }),
    { saved: 0, duplicates: 0, transactions: 0 }
  ) || { saved: 0, duplicates: 0, transactions: 0 }

  const allCompleted = processState?.files.every(f => f.status === 'completed' || f.status === 'error' || f.status === 'cancelled')

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Upload Statements</h1>

      {/* File Selection */}
      {!processState && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.txt,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              multiple
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              {files.length > 0 ? (
                <>
                  <FileText aria-hidden="true" className="w-12 h-12 text-brand-500 mb-3" />
                  <p className="text-gray-900 dark:text-white font-medium">{files.length} file(s) selected</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Click to change files</p>
                </>
              ) : (
                <>
                  <Upload aria-hidden="true" className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-900 dark:text-white font-medium">Drop your statements here</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">or click to browse (multiple files supported)</p>
                </>
              )}
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                  </div>
                  <CloseButton onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-error-500" xClassName="w-4 h-4" />
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <button
              onClick={handleProcess}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Process {files.length} Statement{files.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Processing Progress */}
      {processState && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Processing Files
            </h2>
            {isProcessing ? (
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                Cancel
              </button>
            ) : allCompleted ? (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Upload More
              </button>
            ) : null}
          </div>

          {/* File Progress List */}
          <div className="space-y-3">
            {processState.files.map((file, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  file.status === 'completed'
                    ? 'bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/30'
                    : file.status === 'error'
                    ? 'bg-error-50 dark:bg-error-500/10 border-error-200 dark:border-error-500/30'
                    : file.status === 'cancelled'
                    ? 'bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/30'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className={`text-sm ${
                      file.status === 'error' ? 'text-error-600 dark:text-error-400' :
                      file.status === 'completed' ? 'text-success-600 dark:text-success-400' :
                      file.status === 'cancelled' ? 'text-warning-600 dark:text-warning-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {getStatusText(file)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {allCompleted && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-brand-500">{totalStats.transactions}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Parsed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success-500">{totalStats.saved}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Saved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning-500">{totalStats.duplicates}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duplicates</p>
                </div>
              </div>
            </div>
          )}

          {/* Info about page refresh */}
          {isProcessing && (
            <div className="mt-4 p-3 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 rounded-lg">
              <p className="text-sm text-brand-700 dark:text-brand-400">
                <strong>Note:</strong> Progress is saved. If you refresh the page, completed files will be preserved. However, files currently being processed will need to be re-selected.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

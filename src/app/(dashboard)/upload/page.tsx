'use client'

import { useState } from 'react'
import { Upload, FileText, Check, Loader2, X } from 'lucide-react'

type ParsedTransaction = {
  date: string
  amount: number
  description: string
  category: string
  type: 'income' | 'expense'
}

type SaveResult = {
  saved: number
  duplicates: number
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parseProgress, setParseProgress] = useState({ current: 0, total: 0 })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      setFiles(selectedFiles)
      setTransactions([])
      setSaveResult(null)
      setError(null)
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleParse = async () => {
    if (files.length === 0) return

    setParsing(true)
    setError(null)
    setParseProgress({ current: 0, total: files.length })
    
    const allTransactions: ParsedTransaction[] = []
    
    try {
      for (let i = 0; i < files.length; i++) {
        setParseProgress({ current: i + 1, total: files.length })
        
        const formData = new FormData()
        formData.append('file', files[i])

        const response = await fetch('/api/parse-statement', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()
        if (data.error) {
          setError(`Error parsing ${files[i].name}: ${data.error}`)
        } else if (data.transactions) {
          allTransactions.push(...data.transactions)
        }
      }
      
      // Deduplicate parsed transactions before showing
      const uniqueTransactions = deduplicateTransactions(allTransactions)
      setTransactions(uniqueTransactions)
      
      if (allTransactions.length !== uniqueTransactions.length) {
        const dupes = allTransactions.length - uniqueTransactions.length
        setError(`Found ${dupes} duplicate(s) in uploaded files (removed from preview)`)
      }
    } catch (err) {
      console.error('Error parsing statement:', err)
      setError('Network error while parsing statement')
    } finally {
      setParsing(false)
    }
  }

  const deduplicateTransactions = (txs: ParsedTransaction[]): ParsedTransaction[] => {
    const seen = new Set<string>()
    return txs.filter(t => {
      const key = `${t.date}|${t.description}|${t.amount}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const handleSave = async () => {
    if (transactions.length === 0) return

    setSaving(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      })

      const data = await response.json()
      if (response.ok) {
        setSaveResult({
          saved: data.saved || data.transactions?.length || 0,
          duplicates: data.duplicates || 0
        })
      }
    } catch (error) {
      console.error('Error saving transactions:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Upload Statement</h1>

      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
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
                <FileText className="w-12 h-12 text-blue-400 mb-3" />
                <p className="text-white font-medium">{files.length} file(s) selected</p>
                <p className="text-slate-400 text-sm mt-1">Click to change files</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-400 mb-3" />
                <p className="text-white font-medium">Drop your statements here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse (multiple files supported)</p>
              </>
            )}
          </label>
        </div>

        {files.length > 0 && !transactions.length && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400">
            {error}
          </div>
        )}

        {files.length > 0 && !transactions.length && (
          <button
            onClick={handleParse}
            disabled={parsing}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {parsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Parsing file {parseProgress.current} of {parseProgress.total}...
              </>
            ) : (
              `Parse ${files.length} Statement${files.length > 1 ? 's' : ''}`
            )}
          </button>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Parsed Transactions ({transactions.length})
            </h2>
            {!saveResult ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save All'
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span>
                  Saved {saveResult.saved}
                  {saveResult.duplicates > 0 && (
                    <span className="text-yellow-400 ml-1">
                      ({saveResult.duplicates} duplicates skipped)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-slate-300">{t.date}</td>
                    <td className="py-3 px-4 text-white">{t.description}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-700 rounded text-sm text-slate-300">
                        {t.category}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      t.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, Folder, BookOpen, LinkIcon, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchItem {
  id: string
  title: string
  type: 'subject' | 'module' | 'lecture' | 'link'
  path: string
  subtitle?: string
}

interface DBSubject {
  id: string
  name: string
}

interface DBModule {
  id: string
  name: string
  subject_id: string
}

interface DBLecture {
  id: string
  title: string
  module_id: string
  modules: {
    subject_id: string
  } | null
}

interface DBLink {
  id: string
  title: string
  url: string
  lecture_id: string
  lectures: {
    module_id: string
    modules: {
      subject_id: string
    } | null
  } | null
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [results, setResults] = useState<SearchItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Fetch search index on open
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    const fetchSearchIndex = async () => {
      try {
        const supabase = createClient()
        
        // Fetch subjects
        const { data: subs } = await supabase.from('subjects').select('id, name') as unknown as { data: DBSubject[] | null }
        
        // Fetch modules
        const { data: mods } = await supabase.from('modules').select('id, name, subject_id') as unknown as { data: DBModule[] | null }
        
        // Fetch lectures
        const { data: lecs } = await supabase.from('lectures').select('id, title, module_id, modules(subject_id)') as unknown as { data: DBLecture[] | null }

        // Fetch links
        const { data: links } = await supabase.from('lecture_links').select('id, title, url, lecture_id, lectures(module_id, modules(subject_id))') as unknown as { data: DBLink[] | null }

        const searchIndex: SearchItem[] = []

        if (subs) {
          subs.forEach((s) => {
            searchIndex.push({
              id: s.id,
              title: s.name,
              type: 'subject',
              path: `/subjects/${s.id}`,
              subtitle: 'Subject',
            })
          })
        }

        if (mods) {
          mods.forEach((m) => {
            searchIndex.push({
              id: m.id,
              title: m.name,
              type: 'module',
              path: `/subjects/${m.subject_id}`,
              subtitle: 'Module',
            })
          })
        }

        if (lecs) {
          lecs.forEach((l) => {
            const subjectId = l.modules?.subject_id || ''
            searchIndex.push({
              id: l.id,
              title: l.title,
              type: 'lecture',
              path: subjectId ? `/subjects/${subjectId}?lectureId=${l.id}` : '#',
              subtitle: 'Lecture',
            })
          })
        }

        if (links) {
          links.forEach((lk) => {
            searchIndex.push({
              id: lk.id,
              title: lk.title,
              type: 'link',
              path: lk.url,
              subtitle: `External Link: ${lk.url}`,
            })
          })
        }

        setItems(searchIndex)
      } catch (err) {
        console.error('Failed to load search index:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSearchIndex()
    setQuery('')
    setSelectedIndex(0)
  }, [isOpen])

  // 2. Client-side search fuzzy filter
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const filtered = items.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    )
    setResults(filtered)
    setSelectedIndex(0)
  }, [query, items])

  // 3. Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          const item = results[selectedIndex]
          onClose()
          if (item.type === 'link') {
            window.open(item.path, '_blank')
          } else {
            router.push(item.path)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onClose, router])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/40 backdrop-blur-sm">
      {/* Modal backdrop closer */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Dialog container */}
      <div
        ref={containerRef}
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Input area */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-secondary/35">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search subjects, modules, lectures, or links..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder-muted-foreground"
            autoFocus
          />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground animate-pulse">
              Indexing syllabus...
            </div>
          ) : query.trim() === '' ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Type to start searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No results found for &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-0.5">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onClose()
                      if (item.type === 'link') {
                        window.open(item.path, '_blank')
                      } else {
                        router.push(item.path)
                      }
                    }}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all cursor-pointer ${
                      isSelected ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary/50 border border-transparent'
                    }`}
                  >
                    {item.type === 'subject' && <BookOpen className="h-4 w-4 flex-shrink-0" />}
                    {item.type === 'module' && <Folder className="h-4 w-4 flex-shrink-0" />}
                    {item.type === 'lecture' && <FileText className="h-4 w-4 flex-shrink-0" />}
                    {item.type === 'link' && <LinkIcon className="h-4 w-4 flex-shrink-0" />}

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{item.title}</p>
                      {item.subtitle && <p className="text-4xs text-muted-foreground truncate">{item.subtitle}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

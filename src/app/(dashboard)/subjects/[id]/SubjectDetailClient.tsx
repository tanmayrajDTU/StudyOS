'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBatchToggle } from '@/hooks/useBatchToggle'
import {
  getSubjectDetail,
  updateSubject,
  createModule,
  updateModule,
  deleteModule,
  duplicateModule,
  reorderModules,
  createLecture,
  updateLecture,
  deleteLecture,
  duplicateLecture,
  reorderLectures,
  moveLecture,
  createLink,
  deleteLink,
  bulkImportModules
} from '@/actions/db'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import {
  ArrowLeft,
  Plus,
  Loader2,
  Clock,
  FolderOpen,
  Target
} from 'lucide-react'
import Link from 'next/link'
import { getSubjectIcon } from '@/components/subjects/SortableSubjectCard'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { SortableModuleContainer } from './SortableModuleContainer'

interface SubjectDetailClientProps {
  subjectId: string
  initialSubject: {
    id: string
    name: string
    icon: string
    color: string
    estimated_hours: number
    completed_hours: number
    roadmap_days: number
    is_hidden: boolean
  }
}

export default function SubjectDetailClient({ subjectId }: SubjectDetailClientProps) {
  const queryClient = useQueryClient()
  const [newModuleName, setNewModuleName] = useState('')
  const [isAddingModule, setIsAddingModule] = useState(false)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({})
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [bulkJson, setBulkJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const { toggleLecture, syncing, syncError, retry } = useBatchToggle(subjectId)

  // 1. Fetch complete subject detail
  const { data: detail = null, isLoading } = useQuery({
    queryKey: ['subject-detail', subjectId],
    queryFn: () => getSubjectDetail(subjectId),
  })

  // Set default collapsed state for modules on load
  useEffect(() => {
    if (detail && detail.modules) {
      const state: Record<string, boolean> = {}
      detail.modules.forEach((mod) => {
        state[mod.id] = mod.is_collapsed
      })
      setCollapsedModules(state)
    }
  }, [detail])

  // 2. Mutations
  const updateSubjectMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => updateSubject(subjectId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  const createModuleMutation = useMutation({
    mutationFn: () => createModule(subjectId, newModuleName || 'New Module'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
      setNewModuleName('')
      setIsAddingModule(false)
    },
  })

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      updateModule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const deleteModuleMutation = useMutation({
    mutationFn: (id: string) => deleteModule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const duplicateModuleMutation = useMutation({
    mutationFn: (id: string) => duplicateModule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const reorderModulesMutation = useMutation({
    mutationFn: (items: { id: string; display_order: number }[]) => reorderModules(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const createLectureMutation = useMutation({
    mutationFn: ({ moduleId, title }: { moduleId: string; title: string }) =>
      createLecture(moduleId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const updateLectureMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      updateLecture(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const deleteLectureMutation = useMutation({
    mutationFn: (id: string) => deleteLecture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const duplicateLectureMutation = useMutation({
    mutationFn: (id: string) => duplicateLecture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const reorderLecturesMutation = useMutation({
    mutationFn: (items: { id: string; display_order: number; module_id?: string }[]) =>
      reorderLectures(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const moveLectureMutation = useMutation({
    mutationFn: ({ id, targetModuleId }: { id: string; targetModuleId: string }) =>
      moveLecture(id, targetModuleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const createLinkMutation = useMutation({
    mutationFn: ({ lectureId, title, url }: { lectureId: string; title: string; url: string }) =>
      createLink(lectureId, title, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  const deleteLinkMutation = useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
    },
  })

  // Memoized action handlers
  const handleToggleCollapse = useCallback((moduleId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }, [])

  const handleRenameModule = useCallback((moduleId: string, newName: string) => {
    updateModuleMutation.mutate({ id: moduleId, updates: { name: newName } })
  }, [updateModuleMutation])

  const handleDeleteModule = useCallback((moduleId: string) => {
    deleteModuleMutation.mutate(moduleId)
  }, [deleteModuleMutation])

  const handleDuplicateModule = useCallback((moduleId: string) => {
    duplicateModuleMutation.mutate(moduleId)
  }, [duplicateModuleMutation])

  const handleAddLecture = useCallback((moduleId: string, title: string) => {
    createLectureMutation.mutate({ moduleId, title })
  }, [createLectureMutation])

  const handleUpdateLecture = useCallback((lecId: string, updates: Record<string, unknown>) => {
    if (updates && 'completed_hours' in updates) {
      const newCompletedHours = Number(updates.completed_hours)
      const targetLec = detail?.modules
        .flatMap((m) => m.lectures)
        .find((l) => l.id === lecId)
      if (targetLec) {
        const isCompleted = newCompletedHours > 0
        toggleLecture(lecId, isCompleted, Number(targetLec.estimated_hours), Number(targetLec.completed_hours) > 0)
        return
      }
    }
    updateLectureMutation.mutate({ id: lecId, updates })
  }, [detail, toggleLecture, updateLectureMutation])

  const handleDeleteLecture = useCallback((lecId: string) => {
    deleteLectureMutation.mutate(lecId)
  }, [deleteLectureMutation])

  const handleDuplicateLecture = useCallback((lecId: string) => {
    duplicateLectureMutation.mutate(lecId)
  }, [duplicateLectureMutation])

  const handleCreateLink = useCallback((lecId: string, title: string, url: string) => {
    createLinkMutation.mutate({ lectureId: lecId, title, url })
  }, [createLinkMutation])

  const handleDeleteLink = useCallback((linkId: string) => {
    deleteLinkMutation.mutate(linkId)
  }, [deleteLinkMutation])

  const bulkImportMutation = useMutation({
    mutationFn: (jsonData: Array<{ module: string; lectures: Array<{ title: string; hours: number }> }>) =>
      bulkImportModules(subjectId, jsonData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setIsBulkImporting(false)
      setBulkJson('')
      setImportError(null)
    },
    onError: (err: Error) => {
      setImportError(err.message || 'Import failed. Check logs.')
    }
  })

  const handleImportSubmit = useCallback(() => {
    setImportError(null)
    const trimmed = bulkJson.trim()
    if (!trimmed) {
      setImportError('Please paste some JSON data first.')
      return
    }

    try {
      const parsed = JSON.parse(trimmed)
      
      if (!Array.isArray(parsed)) {
        setImportError('Root element must be a JSON array.')
        return
      }

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i]
        if (typeof item !== 'object' || item === null) {
          setImportError(`Element at index ${i} must be a JSON object.`)
          return
        }
        if (typeof item.module !== 'string' || !item.module.trim()) {
          setImportError(`Element at index ${i} is missing a valid "module" string.`)
          return
        }
        if (!Array.isArray(item.lectures)) {
          setImportError(`Element at index ${i} ("${item.module}") is missing a "lectures" array.`)
          return
        }

        for (let j = 0; j < item.lectures.length; j++) {
          const lec = item.lectures[j]
          if (typeof lec !== 'object' || lec === null) {
            setImportError(`Lecture at index ${j} in module "${item.module}" must be an object.`)
            return
          }
          if (typeof lec.title !== 'string' || !lec.title.trim()) {
            setImportError(`Lecture at index ${j} in module "${item.module}" is missing a valid "title" string.`)
            return
          }
          if (typeof lec.hours !== 'number' || isNaN(lec.hours) || lec.hours < 0) {
            setImportError(`Lecture "${lec.title}" in module "${item.module}" has an invalid "hours" value (must be a positive number).`)
            return
          }
        }
      }

      bulkImportMutation.mutate(parsed)
    } catch (e: unknown) {
      const err = e as Error
      setImportError(`Invalid JSON syntax: ${err.message}`)
    }
  }, [bulkJson, bulkImportMutation])

  // 3. Drag and Drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    if (activeType === 'module' && overType === 'module') {
      if (active.id === over.id) return
      const oldIndex = detail!.modules.findIndex((m) => m.id === active.id)
      const newIndex = detail!.modules.findIndex((m) => m.id === over.id)
      const reordered = arrayMove(detail!.modules, oldIndex, newIndex)
      const updates = reordered.map((mod, idx) => ({ id: mod.id, display_order: idx }))
      reorderModulesMutation.mutate(updates)
    }

    if (activeType === 'lecture') {
      const activeModuleId = active.data.current?.moduleId
      const overModuleId = over.data.current?.moduleId || over.id

      if (activeModuleId !== overModuleId) {
        // Move container
        moveLectureMutation.mutate({ id: String(active.id), targetModuleId: String(overModuleId) })
      } else {
        // Sort inside container
        if (active.id === over.id) return
        const mod = detail!.modules.find((m) => m.id === activeModuleId)
        if (!mod) return

        const oldIndex = mod.lectures.findIndex((l) => l.id === active.id)
        const newIndex = mod.lectures.findIndex((l) => l.id === over.id)
        const reordered = arrayMove(mod.lectures, oldIndex, newIndex)
        const updates = reordered.map((lec, idx) => ({ id: lec.id, display_order: idx }))
        reorderLecturesMutation.mutate(updates)
      }
    }
  }

  const toggleAllCollapse = (collapse: boolean) => {
    if (!detail) return
    const newState: Record<string, boolean> = {}
    detail.modules.forEach((mod) => {
      newState[mod.id] = collapse
    })
    setCollapsedModules(newState)
  }

  if (isLoading || !detail) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Calculate statistics
  const totalHours = Number(detail.estimated_hours) || 0
  const completedHours = Number(detail.completed_hours) || 0
  const progressPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0
  const totalLectures = detail.modules.reduce((acc, m) => acc + (m.lectures?.length || 0), 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Subjects</span>
        </Link>
      </div>

      {/* Header Cards & Stats */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-card shadow-md flex-shrink-0"
            style={{ backgroundColor: detail.color }}
          >
            {getSubjectIcon(detail.icon, 'h-6 w-6')}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <InlineEdit
                value={detail.name}
                onSave={(newName) => updateSubjectMutation.mutate({ name: newName })}
                className="text-2xl font-extrabold text-foreground tracking-tight"
              />
              {syncing && <span className="text-4xs text-muted-foreground animate-pulse font-mono">Saving...</span>}
              {syncError && (
                <span className="text-4xs text-red-500 font-semibold flex items-center gap-1.5 font-mono">
                  {syncError}
                  <button onClick={retry} className="text-primary hover:underline font-bold cursor-pointer">
                    Retry
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {totalLectures} Lectures across {detail.modules.length} Modules
              </p>
              <span className="text-muted-foreground/35 text-xs font-mono">•</span>
              <Link
                href={`/pyqs/${encodeURIComponent(detail.name)}`}
                className="inline-flex items-center gap-1 text-3xs font-extrabold text-primary hover:underline font-mono uppercase tracking-widest"
              >
                <Target className="h-3.5 w-3.5" />
                <span>Practice GATE PYQs</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Progress Display */}
        <div className="w-full md:w-64 space-y-2 flex-shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {completedHours.toFixed(1)}h / {totalHours.toFixed(1)}h
            </span>
            <span className="text-foreground">{progressPercent}% Completed</span>
          </div>

          {/* Bar */}
          <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: detail.color,
                width: `${Math.min(progressPercent, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-secondary/25 border border-border/50 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAllCollapse(false)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-all cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={() => toggleAllCollapse(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-all cursor-pointer"
          >
            Collapse All
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkImporting(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary font-medium px-4 py-1.5 text-xs shadow-sm cursor-pointer transition-all"
          >
            Bulk Import JSON
          </button>
          <button
            onClick={() => setIsAddingModule(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-medium px-4.5 py-1.5 text-xs shadow-sm cursor-pointer transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Module</span>
          </button>
        </div>
      </div>

      {/* Bulk Import JSON Form */}
      {isBulkImporting && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-md animate-in slide-in-from-top duration-150 space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="text-sm font-bold text-foreground">
              Bulk Import Modules & Lectures
            </h3>
            <span className="text-4xs text-muted-foreground font-mono">JSON Format</span>
          </div>

          <p className="text-3xs text-muted-foreground leading-normal">
            Paste a JSON array representing modules and lectures. Keys must match exactly: 
            <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono ml-1">
              [{"{"} &quot;module&quot;: &quot;Name&quot;, &quot;lectures&quot;: [{"{"} &quot;title&quot;: &quot;Name&quot;, &quot;hours&quot;: 1.50 {"}"}] {"}"}]
            </code>
          </p>

          <div className="space-y-2">
            <textarea
              placeholder='[{"module": "Module 1", "lectures": [{"title": "Lec 1", "hours": 1.5}]}]'
              value={bulkJson}
              onChange={(e) => {
                setBulkJson(e.target.value)
                setImportError(null)
              }}
              rows={8}
              className="w-full bg-secondary border border-border rounded-xl p-3 text-2xs text-foreground font-mono focus:outline-none focus:border-primary placeholder-muted-foreground/40 resize-y"
            />
            {importError && (
              <p className="text-3xs text-red-500 font-semibold font-mono bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                ⚠️ {importError}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-border/50 pt-3 border-dashed">
            <button
              onClick={() => {
                setIsBulkImporting(false)
                setBulkJson('')
                setImportError(null)
              }}
              disabled={bulkImportMutation.isPending}
              className="rounded-lg border border-border px-4 py-2 hover:bg-secondary text-foreground text-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={bulkImportMutation.isPending}
              className="rounded-lg bg-foreground text-background font-bold px-4 py-2 hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkImportMutation.isPending ? 'Importing...' : 'Validate & Import'}
            </button>
          </div>
        </div>
      )}

      {/* Add Module Inline Form */}
      {isAddingModule && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-in slide-in-from-top duration-150 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Create Module</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Computer Networks Basics"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder-muted-foreground/60"
              autoFocus
            />
            <button
              onClick={() => setIsAddingModule(false)}
              className="rounded-lg border border-border px-4 py-2 hover:bg-secondary text-foreground text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => createModuleMutation.mutate()}
              className="rounded-lg bg-foreground text-background font-medium px-4 py-2 hover:opacity-90 active:scale-95 transition-all text-sm cursor-pointer"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Modules List Container */}
      {detail.modules.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/25">
          <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Modules Yet</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
            Initialize syllabus components by adding your first module card.
          </p>
          <button
            onClick={() => setIsAddingModule(true)}
            className="rounded-lg bg-foreground text-background font-medium px-4 py-2 hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer"
          >
            Create Module
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={detail.modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {detail.modules.map((module) => (
                <SortableModuleContainer
                  key={module.id}
                  module={module}
                  subjectColor={detail.color}
                  isCollapsed={collapsedModules[module.id] ?? false}
                  onToggleCollapse={() => handleToggleCollapse(module.id)}
                  onRename={(newName) => handleRenameModule(module.id, newName)}
                  onDelete={() => handleDeleteModule(module.id)}
                  onDuplicate={() => handleDuplicateModule(module.id)}
                  onUpdate={(updates) => updateModuleMutation.mutate({ id: module.id, updates })}
                  onAddLecture={(title) => handleAddLecture(module.id, title)}
                  onUpdateLecture={handleUpdateLecture}
                  onDeleteLecture={handleDeleteLecture}
                  onDuplicateLecture={handleDuplicateLecture}
                  onCreateLink={handleCreateLink}
                  onDeleteLink={handleDeleteLink}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

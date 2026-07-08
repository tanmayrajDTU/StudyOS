'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  deleteLink
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
  FolderOpen
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
            <InlineEdit
              value={detail.name}
              onSave={(newName) => updateSubjectMutation.mutate({ name: newName })}
              className="text-2xl font-extrabold text-foreground tracking-tight"
            />
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              {totalLectures} Lectures across {detail.modules.length} Modules
            </p>
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

        <button
          onClick={() => setIsAddingModule(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-medium px-4.5 py-1.5 text-xs shadow-sm cursor-pointer transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Module</span>
        </button>
      </div>

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
                  onToggleCollapse={() =>
                    setCollapsedModules((prev) => ({ ...prev, [module.id]: !prev[module.id] }))
                  }
                  onRename={(newName) => updateModuleMutation.mutate({ id: module.id, updates: { name: newName } })}
                  onDelete={() => deleteModuleMutation.mutate(module.id)}
                  onDuplicate={() => duplicateModuleMutation.mutate(module.id)}
                  onAddLecture={(title) => createLectureMutation.mutate({ moduleId: module.id, title })}
                  onUpdateLecture={(lecId, updates) => updateLectureMutation.mutate({ id: lecId, updates })}
                  onDeleteLecture={(lecId) => deleteLectureMutation.mutate(lecId)}
                  onDuplicateLecture={(lecId) => duplicateLectureMutation.mutate(lecId)}
                  onCreateLink={(lecId, title, url) => createLinkMutation.mutate({ lectureId: lecId, title, url })}
                  onDeleteLink={(linkId) => deleteLinkMutation.mutate(linkId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

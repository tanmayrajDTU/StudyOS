'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  duplicateSubject,
  reorderSubjects
} from '@/actions/db'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { SortableSubjectCard, getSubjectIcon } from '@/components/subjects/SortableSubjectCard'
import { EmptyState } from '@/components/ui/EmptyState'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  estimated_hours: number
  completed_hours: number
  roadmap_days: number
  is_hidden: boolean
  display_order: number
}

export default function SubjectsPage() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newIcon, setNewIcon] = useState('BookOpen')

  // 1. Query for subjects list
  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: () => createSubject(newName || 'New Subject', newIcon, newColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setIsAdding(false)
      setNewName('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      updateSubject(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] })
      const previous = queryClient.getQueryData(['subjects'])

      queryClient.setQueryData(['subjects'], (old: Subject[] | undefined) =>
        old ? old.map((s) => (s.id === id ? { ...s, ...updates } as Subject : s)) : []
      )

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['subjects'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; display_order: number }[]) => reorderSubjects(items),
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] })
      const previous = queryClient.getQueryData(['subjects'])

      // Optimistically apply new order
      queryClient.setQueryData(['subjects'], (old: Subject[] | undefined) => {
        if (!old) return []
        const mapped = [...old]
        newOrder.forEach((item) => {
          const index = mapped.findIndex((s) => s.id === item.id)
          if (index !== -1) {
            mapped[index] = { ...mapped[index], display_order: item.display_order }
          }
        })
        return mapped.sort((a, b) => a.display_order - b.display_order)
      })

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['subjects'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  // 3. dnd-kit configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Allow click on links without initiating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = subjects.findIndex((s) => s.id === active.id)
    const newIndex = subjects.findIndex((s) => s.id === over.id)

    const reordered = arrayMove(subjects, oldIndex, newIndex)

    // Construct array of updates
    const updates = reordered.map((item, idx) => ({
      id: item.id,
      display_order: idx,
    }))

    reorderMutation.mutate(updates)
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const colors = [
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#14b8a6',
    '#f43f5e', '#6366f1', '#eab308', '#d946ef', '#f97316', '#84cc16', '#0ea5e9', '#a855f7',
    '#14b8a6', '#64748b'
  ]
  const icons = [
    'BookOpen', 'Binary', 'Grid', 'TrendingUp', 'Cpu', 'Server', 
    'Code', 'Database', 'Globe', 'Laptop', 'Terminal', 'Hash', 
    'Network', 'Layers', 'Settings', 'Shield', 'HardDrive', 'Folder', 'Compass'
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#F5F5F5] font-mono leading-none">Subjects</h1>
          <p className="text-xs font-medium text-muted-foreground tracking-wide">
            Manage study courses, structure syllabus, and track progress.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-button bg-primary hover:opacity-90 text-primary-foreground font-extrabold px-5 py-2.5 text-xs transition-all cursor-pointer shadow-md shadow-primary/10 h-10"
        >
          <Plus className="h-4 w-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Add Dialog/Inline Card */}
      {isAdding && (
        <div className="rounded-card border border-border/40 bg-card backdrop-blur-md p-8 shadow-xs animate-in slide-in-from-top duration-250 space-y-6">
          <h3 className="text-base font-bold flex items-center gap-2.5 text-[#F5F5F5]">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Create New Subject
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-mono">
                Subject Title
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Networks"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-secondary/35 border border-border/80 rounded-input px-4.5 py-3 text-xs text-foreground focus:outline-none focus:border-primary placeholder-muted-foreground/50 font-medium"
              />
            </div>

            {/* Colors picker */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-mono">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-7.5 w-7.5 rounded-full border border-border/10 cursor-pointer transition-all ${
                      newColor === c ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-[#111216]' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Icons picker */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 font-mono">
                Accent Icon
              </label>
              <div className="flex flex-wrap gap-2.5 max-h-40 overflow-y-auto pr-1">
                {icons.map((i) => (
                  <button
                    key={i}
                    onClick={() => setNewIcon(i)}
                    className={`p-2.5 rounded-lg border cursor-pointer text-xs transition-all flex items-center gap-1.5 h-8.5 ${
                      newIcon === i ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' : 'bg-secondary/45 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                    }`}
                    title={i}
                  >
                    {getSubjectIcon(i, 'h-4 w-4')}
                    <span className="text-[10px] font-mono font-bold">{i}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-border/20">
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-button border border-border bg-card text-[#F5F5F5] hover:bg-secondary text-xs font-bold px-5 py-2.5 cursor-pointer h-10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="rounded-button bg-primary hover:opacity-95 text-primary-foreground font-extrabold px-6 py-2.5 transition-all text-xs cursor-pointer disabled:opacity-50 h-10 shadow-md shadow-primary/10"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of sortable subjects */}
      {subjects.length === 0 ? (
        <EmptyState
          title="No subjects initialized"
          description="Click the button above to add a subject or verify database migration status."
          actionLabel="Add a Subject"
          onAction={() => setIsAdding(true)}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={subjects.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject: Subject) => (
                <SortableSubjectCard
                  key={subject.id}
                  subject={subject}
                  onUpdate={(updates) => updateMutation.mutate({ id: subject.id, updates })}
                  onDelete={() => deleteMutation.mutate(subject.id)}
                  onDuplicate={() => duplicateMutation.mutate(subject.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

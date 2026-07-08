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
import { SortableSubjectCard } from '@/components/subjects/SortableSubjectCard'
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

  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#14b8a6']
  const icons = ['BookOpen', 'Binary', 'Grid', 'TrendingUp', 'Cpu', 'Server', 'Code', 'Database', 'Globe']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Manage study courses, structure syllabus, and track progress.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-medium px-4 py-2 text-sm cursor-pointer shadow transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Add Dialog/Inline Card */}
      {isAdding && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg animate-in slide-in-from-top duration-200">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Create New Subject
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Subject Title
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Networks"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary placeholder-muted-foreground/60"
              />
            </div>

            {/* Colors picker */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Accent Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-7 w-7 rounded-full border border-border/10 cursor-pointer transition-all ${
                      newColor === c ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Icons picker */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Accent Icon
              </label>
              <div className="flex flex-wrap gap-3">
                {icons.map((i) => (
                  <button
                    key={i}
                    onClick={() => setNewIcon(i)}
                    className={`p-2 rounded-lg border cursor-pointer text-xs font-mono transition-all ${
                      newIcon === i ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAdding(false)}
                className="rounded-lg border border-border px-4 py-2 hover:bg-secondary text-foreground text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="rounded-lg bg-foreground text-background font-medium px-4 py-2 hover:opacity-90 active:scale-95 transition-all text-sm cursor-pointer disabled:opacity-50"
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

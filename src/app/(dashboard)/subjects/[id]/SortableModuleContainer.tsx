'use client'

import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Copy,
  Clock,
  Award
} from 'lucide-react'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { SortableLectureItem } from './SortableLectureItem'

interface SortableModuleContainerProps {
  module: {
    id: string
    name: string
    is_collapsed: boolean
    is_important: boolean
    estimated_hours: number
    completed_hours: number
    lectures: Array<{
      id: string
      title: string
      estimated_hours: number
      completed_hours: number
      display_order: number
      is_marked_for_revision: boolean
      importance_level: string
      lecture_links: Array<{
        id: string
        title: string
        url: string
        display_order: number
      }>
    }>
  }
  subjectColor: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  onRename: (newName: string) => void
  onDelete: () => void
  onDuplicate: () => void
  onAddLecture: (title: string) => void
  onUpdateLecture: (lecId: string, updates: Record<string, unknown>) => void
  onDeleteLecture: (lecId: string) => void
  onDuplicateLecture: (lecId: string) => void
  onCreateLink: (lecId: string, title: string, url: string) => void
  onDeleteLink: (linkId: string) => void
}

export const SortableModuleContainer = React.memo(function SortableModuleContainer({
  module,
  subjectColor,
  isCollapsed,
  onToggleCollapse,
  onRename,
  onDelete,
  onDuplicate,
  onAddLecture,
  onUpdateLecture,
  onDeleteLecture,
  onDuplicateLecture,
  onCreateLink,
  onDeleteLink,
}: SortableModuleContainerProps) {
  const [newLectureTitle, setNewLectureTitle] = useState('')
  const [isAddingLecture, setIsAddingLecture] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.id,
    data: {
      type: 'module',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    borderLeft: `5px solid ${subjectColor}`,
  }

  const handleAddLectureSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newLectureTitle.trim()
    if (!trimmed) return
    onAddLecture(trimmed)
    setNewLectureTitle('')
    setIsAddingLecture(false)
  }

  const totalHrs = Number(module.estimated_hours) || 0
  const completedHrs = Number(module.completed_hours) || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow transition-shadow ${
        module.is_important ? 'ring-1 ring-primary/30 border-primary/30' : ''
      }`}
    >
      {/* Module Header Row */}
      <div 
        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border"
        style={{ backgroundColor: `${subjectColor}12` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-muted-foreground/35 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            title="Drag Module to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-muted-foreground hover:bg-secondary cursor-pointer"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          {/* Title Inline Edit */}
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={module.name}
              onSave={onRename}
              className="text-sm font-extrabold text-foreground truncate max-w-lg"
            />
          </div>

          {/* Important Module Star Badge */}
          {module.is_important && (
            <span title="Important syllabus area">
              <Award className="h-4 w-4 text-primary flex-shrink-0 animate-bounce" />
            </span>
          )}
        </div>

        {/* Stats Rollup & Module Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 text-2xs font-semibold text-muted-foreground font-mono bg-card px-2 py-1 rounded-md border border-border/40">
            <Clock className="h-3 w-3" />
            <span>
              {completedHrs.toFixed(1)}h / {totalHrs.toFixed(1)}h
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsAddingLecture(true)}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              title="Add lecture"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              title="Duplicate module"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
              title="Delete module"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lectures List Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 bg-background/5">
          {/* Nested Sortable context for lectures */}
          <SortableContext
            items={module.lectures.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[40px]">
              {module.lectures.length === 0 ? (
                <div className="text-center py-6 text-2xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
                  No lectures in this module. Drag items here or add a new lecture below.
                </div>
              ) : (
                module.lectures.map((lecture) => (
                  <SortableLectureItem
                    key={lecture.id}
                    lecture={lecture}
                    moduleId={module.id}
                    subjectColor={subjectColor}
                    onUpdate={(updates) => onUpdateLecture(lecture.id, updates)}
                    onDelete={() => onDeleteLecture(lecture.id)}
                    onDuplicate={() => onDuplicateLecture(lecture.id)}
                    onCreateLink={(title, url) => onCreateLink(lecture.id, title, url)}
                    onDeleteLink={onDeleteLink}
                  />
                ))
              )}
            </div>
          </SortableContext>

          {/* Add Lecture Quick Form */}
          {isAddingLecture ? (
            <form onSubmit={handleAddLectureSubmit} className="flex gap-2 animate-in slide-in-from-top-1 duration-100">
              <input
                type="text"
                placeholder="Lecture Title..."
                value={newLectureTitle}
                onChange={(e) => setNewLectureTitle(e.target.value)}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsAddingLecture(false)}
                className="text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-secondary text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs bg-foreground text-background font-medium px-3 py-1.5 rounded-lg hover:opacity-90 cursor-pointer"
              >
                Add
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingLecture(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left py-1.5 px-2 hover:bg-secondary/40 rounded-lg border border-dashed border-border/40"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Lecture...</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
})

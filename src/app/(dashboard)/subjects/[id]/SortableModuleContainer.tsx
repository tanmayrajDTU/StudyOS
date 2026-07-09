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
  Award,
  FolderOpen
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
  onUpdate?: (updates: Record<string, unknown>) => void
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
  onUpdate,
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
  const completedCount = module.lectures.filter((l) => l.completed_hours > 0).length
  const totalLectures = module.lectures.length
  const completionPercent = totalHrs > 0 ? Math.round((completedHrs / totalHrs) * 100) : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-module border border-border/50 bg-card overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200 ${
        module.is_important ? 'ring-1 ring-primary/20 border-primary/20' : ''
      }`}
    >
      {/* Module Header Row */}
      <div 
        className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/40 hover:bg-secondary/10 transition-colors"
        style={{ backgroundColor: `${subjectColor}07` }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors rounded-lg hover:bg-secondary/40"
            title="Drag Module to reorder"
          >
            <GripVertical className="h-4.5 w-4.5" />
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
          >
            {isCollapsed ? <ChevronDown className="h-4.5 w-4.5" /> : <ChevronUp className="h-4.5 w-4.5" />}
          </button>

          {/* Module Icon */}
          <div 
            className="h-8 w-8 rounded-lg flex items-center justify-center border"
            style={{ 
              backgroundColor: `${subjectColor}10`,
              borderColor: `${subjectColor}25`,
              color: subjectColor 
            }}
          >
            <FolderOpen className="h-4 w-4" />
          </div>

          {/* Title Inline Edit */}
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={module.name}
              onSave={onRename}
              className="text-sm font-bold text-[#F5F5F5] truncate max-w-lg tracking-wide"
            />
          </div>

          {/* Important Module Star Badge */}
          {module.is_important && (
            <span className="flex items-center gap-1 bg-primary/10 border border-primary/25 text-primary text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded-full" title="Important syllabus area">
              <Award className="h-3 w-3" />
              <span>Important</span>
            </span>
          )}
        </div>

        {/* Stats Rollup & Module Actions */}
        <div className="flex items-center gap-4.5">
          <div className="hidden sm:flex items-center gap-3 text-3xs font-mono font-bold text-muted-foreground bg-secondary/25 border border-border/40 px-3 py-1 rounded-lg">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{completedHrs.toFixed(1)}h/{totalHrs.toFixed(1)}h</span>
            </div>
            <span className="text-border/80">|</span>
            <span>{completedCount}/{totalLectures} Lc</span>
            {totalLectures > 0 && (
              <>
                <span className="text-border/80">|</span>
                <span className="text-[#F5F5F5]">{completionPercent}%</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onUpdate && (
              <button
                onClick={() => onUpdate({ is_important: !module.is_important })}
                className={`p-1.5 rounded-lg hover:bg-secondary cursor-pointer transition-colors ${
                  module.is_important ? 'text-primary' : 'text-muted-foreground/35 hover:text-foreground'
                }`}
                title={module.is_important ? 'Remove important flag' : 'Mark as important'}
              >
                <Award className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsAddingLecture(true)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Add lecture"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Duplicate module"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
              title="Delete module"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Lectures List Content */}
      {!isCollapsed && (
        <div className="p-5 space-y-5 bg-background/5">
          {/* Nested Sortable context for lectures */}
          <SortableContext
            items={module.lectures.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[40px]">
              {module.lectures.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono italic text-muted-foreground border border-dashed border-border/50 rounded-module bg-secondary/5">
                  No lectures in this module. Add a new lecture below to get started.
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
            <form onSubmit={handleAddLectureSubmit} className="flex gap-2 animate-in slide-in-from-top-1 duration-150">
              <input
                type="text"
                placeholder="Lecture Title..."
                value={newLectureTitle}
                onChange={(e) => setNewLectureTitle(e.target.value)}
                className="flex-1 bg-secondary/55 border border-border/80 rounded-input px-4.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-medium"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsAddingLecture(false)}
                className="text-xs border border-border px-4 py-2 rounded-button bg-card hover:bg-secondary text-foreground cursor-pointer transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs bg-primary hover:opacity-95 text-primary-foreground font-extrabold px-4.5 py-2 rounded-button shadow-xs cursor-pointer transition-all"
              >
                Add
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingLecture(true)}
              className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/35 rounded-button border border-dashed border-border/60 w-full text-left py-2.5 px-4 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lecture...</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
})

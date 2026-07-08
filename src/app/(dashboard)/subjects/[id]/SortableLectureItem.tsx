'use client'

import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Trash2,
  Copy,
  Link2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  PlusCircle
} from 'lucide-react'
import { InlineEdit } from '@/components/ui/InlineEdit'

interface SortableLectureItemProps {
  lecture: {
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
  }
  moduleId: string
  subjectColor: string
  onUpdate: (updates: Record<string, unknown>) => void
  onDelete: () => void
  onDuplicate: () => void
  onCreateLink: (title: string, url: string) => void
  onDeleteLink: (linkId: string) => void
}

export function SortableLectureItem({
  lecture,
  moduleId,
  onUpdate,
  onDelete,
  onDuplicate,
  onCreateLink,
  onDeleteLink,
}: SortableLectureItemProps) {
  const [showLinks, setShowLinks] = useState(false)
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [isAddingLink, setIsAddingLink] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lecture.id,
    data: {
      type: 'lecture',
      moduleId,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  // Calculate lecture completion state
  const isCompleted = Number(lecture.completed_hours) >= Number(lecture.estimated_hours) && Number(lecture.estimated_hours) > 0

  const handleToggleComplete = () => {
    const hours = isCompleted ? 0.00 : Number(lecture.estimated_hours)
    onUpdate({ completed_hours: hours })
  }

  const handleAddLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const title = newLinkTitle.trim()
    let url = newLinkUrl.trim()
    if (!title || !url) return

    // Prepend http if not present
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url
    }

    onCreateLink(title, url)
    setNewLinkTitle('')
    setNewLinkUrl('')
    setIsAddingLink(false)
  }

  const cycleImportance = () => {
    const levels = ['NONE', 'LOW', 'MEDIUM', 'HIGH']
    const currentIndex = levels.indexOf(lecture.importance_level)
    const nextLevel = levels[(currentIndex + 1) % levels.length]
    onUpdate({ importance_level: nextLevel })
  }

  const getImportanceBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-500 border border-red-500/20'
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
      case 'LOW':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
      default:
        return 'bg-secondary text-muted-foreground border border-border/50'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border/80 bg-card p-3.5 hover:border-border transition-all space-y-3 relative ${
        isCompleted ? 'border-primary/20 bg-primary/2' : ''
      }`}
    >
      {/* Upper Main Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Left Actions: Drag handle, Checkbox, Title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-muted-foreground/35 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            title="Drag Lecture to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Toggle Completion */}
          <button
            onClick={handleToggleComplete}
            className={`p-0.5 rounded-full border cursor-pointer transition-all hover:scale-105 flex-shrink-0 ${
              isCompleted
                ? 'text-primary border-primary bg-primary/5'
                : 'text-muted-foreground/40 border-border/80 hover:text-foreground hover:border-border'
            }`}
            title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>

          {/* Title Inline Edit */}
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={lecture.title}
              onSave={(newTitle) => onUpdate({ title: newTitle })}
              className={`text-xs font-bold text-foreground truncate ${
                isCompleted ? 'line-through text-muted-foreground/75 font-normal' : ''
              }`}
            />
          </div>
        </div>

        {/* Right Actions: Hours, Importance, Revision, Links count, Actions */}
        <div className="flex items-center gap-3.5 flex-shrink-0 ml-auto">
          {/* Estimated Hours edit */}
          <div className="flex items-center gap-1 text-3xs font-semibold text-muted-foreground font-mono bg-secondary/40 px-2 py-0.5 rounded border border-border/40">
            <Clock className="h-3 w-3" />
            <InlineEdit
              value={lecture.estimated_hours.toString()}
              type="number"
              onSave={(newVal) => onUpdate({ estimated_hours: parseFloat(newVal) || 1.0 })}
              className="w-10 text-center font-bold text-foreground border-none hover:bg-transparent"
            />
            <span>h</span>
          </div>

          {/* Importance level badge */}
          <button
            onClick={cycleImportance}
            className={`text-4xs font-extrabold uppercase px-1.5 py-0.5 rounded cursor-pointer transition-all hover:opacity-90 ${getImportanceBadge(
              lecture.importance_level
            )}`}
            title="Cycle importance level (None → Low → Medium → High)"
          >
            {lecture.importance_level === 'NONE' ? 'Priority' : lecture.importance_level}
          </button>

          {/* Revision flag */}
          <button
            onClick={() => onUpdate({ is_marked_for_revision: !lecture.is_marked_for_revision })}
            className={`p-1 rounded hover:bg-secondary cursor-pointer transition-colors ${
              lecture.is_marked_for_revision ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground'
            }`}
            title={lecture.is_marked_for_revision ? 'Marked for revision' : 'Flag for revision'}
          >
            {lecture.is_marked_for_revision ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>

          {/* Links toggle */}
          <button
            onClick={() => setShowLinks(!showLinks)}
            className={`p-1 rounded hover:bg-secondary cursor-pointer transition-colors flex items-center gap-0.5 ${
              showLinks || lecture.lecture_links?.length > 0
                ? 'text-primary bg-primary/5 border border-primary/10'
                : 'text-muted-foreground/50 hover:text-foreground'
            }`}
            title="Manage references & resources"
          >
            <Link2 className="h-4 w-4" />
            {lecture.lecture_links?.length > 0 && (
              <span className="text-4xs font-mono font-extrabold px-1 rounded bg-primary text-primary-foreground">
                {lecture.lecture_links.length}
              </span>
            )}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-0.5 border-l border-border/40 pl-1.5">
            <button
              onClick={onDuplicate}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              title="Duplicate lecture"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
              title="Delete lecture"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown Links Sub-Row */}
      {showLinks && (
        <div className="border-t border-border/40 pt-3.5 pl-7 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <h4 className="text-3xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
            <Link2 className="h-3 w-3" />
            Syllabus Reference Links
          </h4>

          {/* Existing links list */}
          {lecture.lecture_links?.length === 0 ? (
            <p className="text-3xs text-muted-foreground italic pl-1">No references added. Add study resources below.</p>
          ) : (
            <div className="space-y-1.5 pl-1">
              {lecture.lecture_links?.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-3 text-xs bg-secondary/20 hover:bg-secondary/45 border border-border/40 rounded-lg p-2 transition-all">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors hover:underline truncate max-w-md"
                  >
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    <span>{link.title}</span>
                  </a>
                  <button
                    onClick={() => onDeleteLink(link.id)}
                    className="p-1 text-muted-foreground/60 hover:text-destructive rounded transition-colors cursor-pointer"
                    title="Delete link"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Link Form */}
          {isAddingLink ? (
            <form onSubmit={handleAddLinkSubmit} className="space-y-2 p-2 border border-dashed border-border/50 rounded-lg bg-card/45 animate-in slide-in-from-top-1 duration-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Link Title (e.g. GeeksforGeeks)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-2.5 py-1 text-2xs text-foreground focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="URL (e.g. www.geeksforgeeks.org)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="bg-secondary border border-border rounded-lg px-2.5 py-1 text-2xs text-foreground focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 text-3xs font-semibold pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingLink(false)}
                  className="border border-border px-2.5 py-1 rounded hover:bg-secondary text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-foreground text-background font-medium px-2.5 py-1 rounded hover:opacity-90 cursor-pointer"
                >
                  Add Link
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingLink(true)}
              className="flex items-center gap-1 text-3xs font-extrabold text-muted-foreground hover:text-foreground transition-colors cursor-pointer pl-1"
            >
              <PlusCircle className="h-3 w-3" />
              <span>Add study link...</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

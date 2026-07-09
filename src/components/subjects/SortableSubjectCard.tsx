'use client'

import React from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  BookOpen,
  Binary,
  Grid,
  TrendingUp,
  Cpu,
  Server,
  Code,
  Database,
  Globe,
  Trash2,
  Copy,
  EyeOff,
  Eye,
  Clock,
  Laptop,
  Terminal,
  Hash,
  Network,
  Layers,
  Settings,
  Shield,
  HardDrive,
  Folder,
  Compass
} from 'lucide-react'
import { InlineEdit } from '@/components/ui/InlineEdit'

// Dynamic icon helper
export function getSubjectIcon(iconName: string, className?: string) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    BookOpen,
    Binary,
    Grid,
    TrendingUp,
    Cpu,
    Server,
    Code,
    Database,
    Globe,
    Laptop,
    Terminal,
    Hash,
    Network,
    Layers,
    Settings,
    Shield,
    HardDrive,
    Folder,
    Compass,
  }

  const IconComponent = map[iconName] || BookOpen
  return <IconComponent className={className} />
}

interface SortableSubjectCardProps {
  subject: {
    id: string
    name: string
    icon: string
    color: string
    estimated_hours: number
    completed_hours: number
    roadmap_days: number
    is_hidden: boolean
  }
  onUpdate: (updates: Record<string, unknown>) => void
  onDelete: () => void
  onDuplicate: () => void
}

export function SortableSubjectCard({
  subject,
  onUpdate,
  onDelete,
  onDuplicate,
}: SortableSubjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  // Calculate progress percent
  const total = Number(subject.estimated_hours) || 0
  const completed = Number(subject.completed_hours) || 0
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-card border border-border/40 bg-card p-5.5 hover:-translate-y-[2px] hover:shadow-xs hover:border-border/80 transition-all duration-300 flex flex-col justify-between min-h-[195px] relative ${
        subject.is_hidden ? 'opacity-65' : ''
      }`}
    >
      {/* Top row: Drag handle & Action bar */}
      <div className="flex items-center justify-between gap-3 mb-4.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 text-muted-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors rounded-lg hover:bg-secondary/40"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Icon & Details */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className="h-8.5 w-8.5 rounded-xl flex items-center justify-center border shadow-xs flex-shrink-0 transition-all"
            style={{ 
              backgroundColor: `${subject.color}15`, 
              borderColor: `${subject.color}35`,
              color: subject.color 
            }}
          >
            {getSubjectIcon(subject.icon, 'h-4.5 w-4.5')}
          </div>

          <div className="min-w-0 flex-1">
            <InlineEdit
              value={subject.name}
              onSave={(newName) => onUpdate({ name: newName })}
              className="text-[15px] font-bold text-[#F5F5F5] font-sans tracking-tight"
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onUpdate({ is_hidden: !subject.is_hidden })}
            className="p-1.5 rounded-lg hover:bg-secondary/45 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title={subject.is_hidden ? 'Show subject' : 'Hide subject'}
          >
            {subject.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg hover:bg-secondary/45 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Duplicate Subject"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
            title="Delete Subject"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Middle row: Study progress stats */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {completed.toFixed(1)}h / {total.toFixed(1)}h
            </span>
          </div>
          <span className="text-[#F5F5F5]">{progressPercent}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#16181D] h-1.5 rounded-full overflow-hidden border border-border/20">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              backgroundColor: subject.color,
              width: `${Math.min(progressPercent, 100)}%`,
              boxShadow: `0 0 8px ${subject.color}40`
            }}
          />
        </div>
      </div>

      {/* Bottom row: Click to navigate */}
      <div className="border-t border-border/20 pt-3 mt-auto">
        <Link
          href={`/subjects/${subject.id}`}
          className="flex items-center justify-center text-[11px] font-mono font-bold uppercase tracking-wider text-primary bg-[#16181D] hover:bg-[#16181D]/80 border border-border/40 hover:border-border/80 rounded-button w-full text-center py-2 h-9 transition-all cursor-pointer shadow-xs"
        >
          Open Course Structure
        </Link>
      </div>
    </div>
  )
}

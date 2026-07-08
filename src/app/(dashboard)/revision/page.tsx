'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRevisionLectures,
  addRevisionSession,
  toggleMarkForRevision,
  getPriorityTopics,
  updateLectureImportance,
  toggleModuleImportance,
  getSubjects
} from '@/actions/db'
import {
  RotateCw,
  Sparkles,
  Award,
  Trash2,
  Check,
  Loader2,
  MessageSquare,
  Clock,
  Filter,
  CheckCircle2
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { EmptyState } from '@/components/ui/EmptyState'

interface Subject {
  id: string
  name: string
  color: string
}

interface LectureRevision {
  id: string
  title: string
  importance_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  is_marked_for_revision: boolean
  module_id: string
  modules: {
    id: string
    name: string
    is_important: boolean
    subjects: Subject | null
  } | null
  revisions: Array<{
    id: string
    revision_date: string
    revision_number: number
    comments: string
  }>
}

interface ModulePriority {
  id: string
  name: string
  is_important: boolean
  subject_id: string
  subjects: Subject | null
}

interface LecturePriority {
  id: string
  title: string
  importance_level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  modules: {
    id: string
    name: string
    subjects: Subject | null
  } | null
}

export default function RevisionPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'queue' | 'priority'>('queue')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [revisionComments, setRevisionComments] = useState<Record<string, string>>({})

  // 1. Queries
  const { data: revisionData = [], isLoading: loadingRevs } = useQuery({
    queryKey: ['revisions'],
    queryFn: () => getRevisionLectures(),
  })

  const { data: priorityData = null, isLoading: loadingPriority } = useQuery({
    queryKey: ['priority-topics'],
    queryFn: () => getPriorityTopics(),
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  // 2. Mutations
  const addSessionMutation = useMutation({
    mutationFn: (variables: { lectureId: string; comments?: string }) =>
      addRevisionSession(variables.lectureId, variables.comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] })
      queryClient.invalidateQueries({ queryKey: ['priority-topics'] })
    }
  })

  const toggleRevisionMutation = useMutation({
    mutationFn: (variables: { lectureId: string; marked: boolean }) =>
      toggleMarkForRevision(variables.lectureId, variables.marked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] })
      queryClient.invalidateQueries({ queryKey: ['priority-topics'] })
    }
  })

  const updateImportanceMutation = useMutation({
    mutationFn: (variables: { lectureId: string; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE' }) =>
      updateLectureImportance(variables.lectureId, variables.level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions'] })
      queryClient.invalidateQueries({ queryKey: ['priority-topics'] })
    }
  })

  const toggleModuleMutation = useMutation({
    mutationFn: (variables: { moduleId: string; isImportant: boolean }) =>
      toggleModuleImportance(variables.moduleId, variables.isImportant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priority-topics'] })
      queryClient.invalidateQueries({ queryKey: ['revisions'] })
    }
  })

  const isLoading = loadingRevs || loadingPriority

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const revisions = revisionData as unknown as LectureRevision[]
  const modules = (priorityData?.modules || []) as unknown as ModulePriority[]
  const lectures = (priorityData?.lectures || []) as unknown as LecturePriority[]

  // Filters
  const filteredRevisions = revisions.filter((rev) => {
    if (subjectFilter === 'all') return true
    return rev.modules?.subjects?.id === subjectFilter
  })

  const filteredModules = modules.filter((mod) => {
    if (subjectFilter === 'all') return true
    return mod.subject_id === subjectFilter
  })

  const filteredLectures = lectures.filter((lec) => {
    if (subjectFilter === 'all') return true
    return lec.modules?.subjects?.id === subjectFilter
  })

  return (
    <div className="space-y-8 pb-12">
      {/* Header and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCw className="h-5.5 w-5.5 text-primary" />
            Revision &amp; Priority Topics
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage spaced repetition revision queue and target high-importance syllabus areas.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-secondary/35 p-1 rounded-xl border border-border/40 self-start md:self-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'queue' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Revision Queue ({filteredRevisions.length})
          </button>
          <button
            onClick={() => setActiveTab('priority')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'priority' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Priority Syllabus ({filteredModules.length + filteredLectures.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-secondary/15 px-4 py-2.5 rounded-xl border border-border/30 text-xs">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground font-medium">Filter by Subject:</span>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="bg-card border border-border rounded px-2.5 py-1 focus:outline-none focus:border-primary text-2xs font-mono font-semibold"
        >
          <option value="all">All Subjects</option>
          {subjects.map((sub: Subject) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tab 1: Revision Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {filteredRevisions.length === 0 ? (
            <EmptyState
              title="Revision Queue Empty"
              description="No lectures are currently flagged for revision. Click the bookmark revisions icon on any lecture card inside subject trees to flag them here."
            />
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredRevisions.map((rev) => {
                const sub = rev.modules?.subjects
                const lastRev =
                  rev.revisions.length > 0
                    ? rev.revisions.reduce((max, r) =>
                        new Date(r.revision_date) > new Date(max.revision_date) ? r : max
                      )
                    : null

                const isSaving =
                  addSessionMutation.isPending &&
                  addSessionMutation.variables?.lectureId === rev.id

                return (
                  <div
                    key={rev.id}
                    className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-border/80 transition-all"
                  >
                    <div className="space-y-3.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {sub && (
                          <span
                            className="text-4xs font-bold font-mono px-2 py-0.5 rounded text-card"
                            style={{ backgroundColor: sub.color }}
                          >
                            {sub.name}
                          </span>
                        )}
                        <span className="text-4xs font-medium text-muted-foreground">
                          Module: {rev.modules?.name}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground truncate">{rev.title}</h3>

                      <div className="flex items-center gap-6 text-3xs font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RotateCw className="h-3 w-3 text-primary" />
                          Revisions: {rev.revisions.length} times
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" />
                          Last revised:{' '}
                          {lastRev
                            ? `${formatDistanceToNow(parseISO(lastRev.revision_date))} ago`
                            : 'Never'}
                        </span>
                      </div>

                      {/* Log Comments Section */}
                      <div className="pt-2 max-w-md">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Add quick notes or comments..."
                            value={revisionComments[rev.id] || ''}
                            onChange={(e) =>
                              setRevisionComments({
                                ...revisionComments,
                                [rev.id]: e.target.value,
                              })
                            }
                            className="w-full bg-secondary/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-2xs text-foreground focus:outline-none focus:border-primary font-mono placeholder:text-muted-foreground/50"
                          />
                          <MessageSquare className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        onClick={() =>
                          addSessionMutation.mutate({
                            lectureId: rev.id,
                            comments: revisionComments[rev.id],
                          })
                        }
                        disabled={isSaving}
                        className="rounded-lg bg-foreground text-background font-bold px-3.5 py-2 text-2xs hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Complete Session</span>
                      </button>

                      <button
                        onClick={() =>
                          toggleRevisionMutation.mutate({ lectureId: rev.id, marked: false })
                        }
                        className="rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border p-2 hover:text-foreground transition-all cursor-pointer"
                        title="Remove from queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Priority Topics */}
      {activeTab === 'priority' && (
        <div className="space-y-8">
          {/* Important Modules List */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" />
              Important Syllabus Modules ({filteredModules.length})
            </h3>

            {filteredModules.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-2">No important modules.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredModules.map((mod: ModulePriority) => {
                  const sub = mod.subjects

                  return (
                    <div
                      key={mod.id}
                      className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        {sub && (
                          <span
                            className="text-5xs font-bold font-mono px-2 py-0.5 rounded text-card"
                            style={{ backgroundColor: sub.color }}
                          >
                            {sub.name}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-foreground">{mod.name}</h4>
                      </div>

                      <button
                        onClick={() =>
                          toggleModuleMutation.mutate({
                            moduleId: mod.id,
                            isImportant: false,
                          })
                        }
                        className="rounded-lg bg-secondary text-primary border border-border/40 hover:bg-secondary/80 px-2.5 py-1 text-4xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Unmark Module Important"
                      >
                        <Check className="h-3 w-3" />
                        <span>Important</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Priority Lectures List */}
          <div className="space-y-4 pt-4 border-t border-border/30">
            <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
              Priority Lectures ({filteredLectures.length})
            </h3>

            {filteredLectures.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-2">No priority lectures.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredLectures.map((lec: LecturePriority) => {
                  const sub = lec.modules?.subjects

                  return (
                    <div
                      key={lec.id}
                      className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-border/80 transition-all"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {sub && (
                            <span
                              className="text-4xs font-bold font-mono px-2 py-0.5 rounded text-card"
                              style={{ backgroundColor: sub.color }}
                            >
                              {sub.name}
                            </span>
                          )}
                          <span className="text-4xs font-medium text-muted-foreground">
                            Module: {lec.modules?.name}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-foreground truncate">{lec.title}</h4>
                      </div>

                      {/* Importance Level Select Dropdown */}
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xs font-mono text-muted-foreground">Priority:</span>
                        <select
                          value={lec.importance_level}
                          onChange={(e) =>
                            updateImportanceMutation.mutate({
                              lectureId: lec.id,
                              level: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE',
                            })
                          }
                          className={`border rounded px-2.5 py-1 text-2xs font-mono font-extrabold focus:outline-none bg-card ${
                            lec.importance_level === 'HIGH'
                              ? 'border-red-500/30 text-red-500 bg-red-500/5'
                              : lec.importance_level === 'MEDIUM'
                              ? 'border-amber-500/30 text-amber-500 bg-amber-500/5'
                              : lec.importance_level === 'LOW'
                              ? 'border-blue-500/30 text-blue-500 bg-blue-500/5'
                              : 'border-border text-muted-foreground bg-secondary/20'
                          }`}
                        >
                          <option value="NONE">None</option>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

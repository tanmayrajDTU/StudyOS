'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getPyqSubjectDetail } from '@/actions/pyq'
import {
  Award,
  ChevronRight,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Bookmark,
  Calendar,
  Sparkles,
  HelpCircle,
  Play
} from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface TopicDetail {
  name: string
  questionCount: number
  solved: number
  incorrect: number
  bookmarked: number
  markedForReview: number
  remaining: number
  accuracy: number
  lastAttempt: string | null
}

interface SubjectDetail {
  subject: string
  totalTopics: number
  totalQuestions: number
  solvedCount: number
  incorrectCount: number
  remainingCount: number
  accuracy: number
  progressPercent: number
  topics: TopicDetail[]
}

export default function PyqSubjectDetailPage() {
  const params = useParams()
  const subjectName = decodeURIComponent(params.subjectName as string)

  const [searchQuery, setSearchQuery] = useState('')

  const { data: detail = null, isLoading } = useQuery<SubjectDetail>({
    queryKey: ['pyq-subject', subjectName],
    queryFn: () => getPyqSubjectDetail(subjectName),
  })

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
        <h3 className="text-sm font-bold text-foreground">Subject details not found</h3>
        <Link href="/pyqs" className="text-xs text-primary hover:underline mt-2 inline-block">
          Go back to PYQ subjects
        </Link>
      </div>
    )
  }

  const filteredTopics = detail.topics.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold font-mono">
        <Link href="/pyqs" className="hover:text-primary transition-colors">PYQ Practice</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{detail.subject}</span>
      </div>

      {/* Analytics Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Banner */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Award className="h-48 w-48 text-foreground" />
          </div>
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-3xs font-extrabold uppercase tracking-widest font-mono">
              <Sparkles className="h-3 w-3" />
              <span>Syllabus Analytics</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {detail.subject}
            </h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              {detail.totalTopics} Topics • {detail.totalQuestions} Questions
            </p>
          </div>

          <div className="space-y-2 mt-6 max-w-md">
            <div className="flex justify-between text-3xs font-semibold text-muted-foreground font-mono">
              <span>Syllabus Completion</span>
              <span>{detail.progressPercent}%</span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${detail.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Analytics Card */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-2xs">
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-widest text-muted-foreground font-mono">
              Performance Summary
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/25 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Solved</span>
                <span className="text-lg font-black text-foreground mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                  {detail.solvedCount}
                </span>
              </div>
              <div className="bg-secondary/25 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Incorrect</span>
                <span className="text-lg font-black text-foreground mt-1 flex items-center gap-1.5">
                  <XCircle className="h-4.5 w-4.5 text-destructive" />
                  {detail.incorrectCount}
                </span>
              </div>
              <div className="bg-secondary/25 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Remaining</span>
                <span className="text-lg font-black text-foreground mt-1">
                  {detail.remainingCount}
                </span>
              </div>
              <div className="bg-secondary/25 border border-border/40 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-4xs text-muted-foreground font-semibold font-mono uppercase">Accuracy</span>
                <span className="text-lg font-black text-primary mt-1">
                  {detail.accuracy}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 bg-secondary/15 border border-border/50 rounded-xl p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search topics in this subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-xs md:text-sm text-foreground focus:outline-none focus:border-primary placeholder-muted-foreground/50 transition-colors"
          />
        </div>
      </div>

      {/* Topic List */}
      <div className="space-y-4">
        {filteredTopics.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card">
            <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground/55 mb-2" />
            <h3 className="text-sm font-bold text-foreground">No topics found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
          </div>
        ) : (
          filteredTopics.map((t) => (
            <div
              key={t.name}
              className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all duration-300 shadow-2xs hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              {/* Topic Info */}
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground text-sm md:text-base leading-tight group-hover:text-primary transition-colors">
                    {t.name}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap text-4xs font-semibold text-muted-foreground font-mono">
                    <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/40 text-foreground">
                      {t.questionCount} Questions
                    </span>
                    {t.lastAttempt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last attempted {formatDistanceToNow(parseISO(t.lastAttempt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Substats */}
                <div className="flex items-center gap-4 text-3xs font-semibold text-muted-foreground font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Solved: <strong className="text-foreground">{t.solved}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-destructive/80" />
                    Incorrect: <strong className="text-foreground">{t.incorrect}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark className="h-3.5 w-3.5 text-amber-500/80" />
                    Bookmarked: <strong className="text-foreground">{t.bookmarked}</strong>
                  </span>
                  {t.solved > 0 && (
                    <span className="text-primary bg-primary/5 border border-primary/10 rounded px-1.5 py-0.5">
                      Accuracy: {t.accuracy}%
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/pyqs/${encodeURIComponent(detail.subject)}/${encodeURIComponent(t.name)}`}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background font-bold text-xs px-5 py-2.5 hover:opacity-90 active:scale-95 transition-all shadow-sm flex-shrink-0 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Practice</span>
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

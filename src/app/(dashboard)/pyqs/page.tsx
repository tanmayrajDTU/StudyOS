'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getPyqSubjects } from '@/actions/pyq'
import {
  BookOpen,
  Search,
  HelpCircle,
  ArrowRight,
  Loader2,
  Award,
  Sparkles,
  Plus
} from 'lucide-react'

interface PyqSubject {
  name: string
  totalTopics: number
  totalQuestions: number
  solvedCount: number
  incorrectCount: number
  remainingCount: number
  accuracy: number
  progressPercent: number
}

export default function PyqSubjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data: subjects = [], isLoading } = useQuery<PyqSubject[]>({
    queryKey: ['pyq-subjects'],
    queryFn: () => getPyqSubjects(),
  })

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative rounded-2xl border border-border bg-card p-6 md:p-8 overflow-hidden shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Award className="h-64 w-64 text-foreground" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-3xs font-extrabold uppercase tracking-widest font-mono">
            <Sparkles className="h-3 w-3" />
            <span>PYQ Practice</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            GATE PYQ Practice Engine
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Practice previous year questions organized by subject and topic. Solve questions, inspect interactive solutions, and track your syllabus accuracy dynamically.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-secondary/15 border border-border/50 rounded-xl p-3 flex-wrap md:flex-nowrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search subjects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-xs md:text-sm text-foreground focus:outline-none focus:border-primary placeholder-muted-foreground/50 transition-colors"
          />
        </div>
        <Link
          href="/pyqs/add"
          className="flex items-center gap-1.5 rounded-lg bg-foreground text-background font-bold text-xs px-4 py-2 hover:opacity-90 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Question</span>
        </Link>
      </div>

      {/* Grid of Subjects */}
      {filteredSubjects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card">
          <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground/55 mb-2" />
          <h3 className="text-sm font-bold text-foreground">No subjects found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try refining your search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((s) => (
            <Link
              key={s.name}
              href={`/pyqs/${encodeURIComponent(s.name)}`}
              className="group rounded-2xl border border-border bg-card p-5.5 hover:border-primary/50 transition-all duration-300 shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm md:text-base leading-tight">
                      {s.name}
                    </h3>
                    <p className="text-3xs text-muted-foreground font-semibold font-mono uppercase tracking-wider">
                      {s.totalTopics} Topics • {s.totalQuestions} Questions
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-all">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Accuracy and count stats */}
                <div className="grid grid-cols-3 gap-2 bg-secondary/20 border border-border/40 rounded-xl p-3 text-center">
                  <div>
                    <p className="text-4xs text-muted-foreground uppercase font-semibold font-mono">Solved</p>
                    <p className="font-bold text-foreground text-xs mt-0.5">{s.solvedCount}</p>
                  </div>
                  <div>
                    <p className="text-4xs text-muted-foreground uppercase font-semibold font-mono">Remaining</p>
                    <p className="font-bold text-foreground text-xs mt-0.5">{s.remainingCount}</p>
                  </div>
                  <div>
                    <p className="text-4xs text-muted-foreground uppercase font-semibold font-mono">Accuracy</p>
                    <p className={`font-bold text-xs mt-0.5 ${s.solvedCount > 0 ? 'text-primary' : 'text-foreground'}`}>
                      {s.accuracy}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress and Link button */}
              <div className="space-y-3 mt-5">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-3xs font-semibold text-muted-foreground font-mono">
                    <span>Progress</span>
                    <span>{s.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${s.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end text-3xs font-bold text-primary gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Enter Subject</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

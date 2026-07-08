'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { generateRoadmap, getRoadmapDetails } from '@/actions/roadmap'
import { toggleLectureComplete, updateLectureCompletedHours } from '@/actions/db'
import {
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Check
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface RoadmapItem {
  id: string
  roadmap_id: string
  lecture_id: string
  scheduled_date: string
  study_order: number
  completed_hours: number
  lectures: {
    id: string
    title: string
    estimated_hours: number
    completed_hours: number
    modules: {
      id: string
      name: string
      subjects: {
        id: string
        name: string
        color: string
      } | null
    } | null
  } | null
}

export default function RoadmapPage() {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 1. Fetch roadmap data
  const { data: roadmapData = null, isLoading } = useQuery({
    queryKey: ['roadmap'],
    queryFn: () => getRoadmapDetails(),
  })

  // 2. Generate roadmap mutation
  const generateMutation = useMutation({
    mutationFn: (start: string) => generateRoadmap(start),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
      setSuccessMsg(`Roadmap created with ${res.itemsCount} scheduled lectures! Target finish: ${res.finishDate}`)
      setTimeout(() => setSuccessMsg(''), 6000)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Failed to generate roadmap.'
      setErrorMsg(message)
      setTimeout(() => setErrorMsg(''), 5000)
    }
  })

  // 3. Toggle checklist item mutation
  const toggleMutation = useMutation({
    mutationFn: (variables: { lectureId: string; isCompleted: boolean }) =>
      toggleLectureComplete(variables.lectureId, variables.isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
    }
  })

  // 4. Update completed hours slider mutation
  const sliderMutation = useMutation({
    mutationFn: (variables: { lectureId: string; hours: number }) =>
      updateLectureCompletedHours(variables.lectureId, variables.hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
    }
  })

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')
    generateMutation.mutate(startDate)
  }

  const handleRecalculate = () => {
    setSuccessMsg('')
    setErrorMsg('')
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    generateMutation.mutate(todayStr)
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Group items by scheduled_date
  const items = (roadmapData?.items || []) as unknown as RoadmapItem[]
  const grouped: Record<string, RoadmapItem[]> = {}
  items.forEach((item) => {
    const d = item.scheduled_date
    grouped[d] = grouped[d] || []
    grouped[d].push(item)
  })

  // Sort dates ascending
  const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-5.5 w-5.5 text-primary" />
            Study Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage your daily personalized study schedule.
          </p>
        </div>

        {roadmapData && (
          <button
            onClick={handleRecalculate}
            disabled={generateMutation.isPending}
            className="self-start sm:self-auto rounded-lg bg-secondary text-foreground hover:bg-secondary/80 border border-border px-3 py-1.5 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-3 w-3 text-primary" />
            )}
            <span>Recalculate from Today</span>
          </button>
        )}
      </div>

      {/* Success/Error alerts */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-4 text-xs flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 p-4 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Empty state / Roadmap Generator */}
      {!roadmapData ? (
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-6 max-w-lg mx-auto">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">No Active Roadmap</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              You haven&apos;t generated a study roadmap yet. Select a start date to calculate a deterministic daily plan based on your daily hour target.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4 pt-2">
            <div className="space-y-2 text-left">
              <label className="text-3xs font-extrabold uppercase text-muted-foreground tracking-widest font-mono">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full bg-foreground text-background font-bold text-sm py-2 px-4 rounded-lg hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scheduling Syllabus...</span>
                </>
              ) : (
                <span>Generate Study Roadmap</span>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Roadmap Info Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm text-xs font-mono">
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider">Start Date</p>
              <p className="font-bold text-foreground text-sm mt-1">
                {format(parseISO(roadmapData.roadmap.start_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider">Target Finish</p>
              <p className="font-bold text-foreground text-sm mt-1 text-primary">
                {roadmapData.roadmap.target_finish_date
                  ? format(parseISO(roadmapData.roadmap.target_finish_date), 'MMM d, yyyy')
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider">Daily Target</p>
              <p className="font-bold text-foreground text-sm mt-1">
                {roadmapData.roadmap.daily_target_hours} hrs/day
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider">Lectures Left</p>
              <p className="font-bold text-foreground text-sm mt-1">
                {items.filter(item => {
                  const lec = item.lectures
                  return Number(lec?.completed_hours) < Number(lec?.estimated_hours)
                }).length} remaining
              </p>
            </div>
          </div>

          {/* Grouped Calendar Days */}
          <div className="space-y-6">
            <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
              Daily Schedule View
            </h3>

            {sortedDates.map((dateStr, idx) => {
              const dayItems = grouped[dateStr]
              const totalEstDay = dayItems.reduce((sum, item) => {
                const lec = item.lectures
                return sum + (Number(lec?.estimated_hours) || 0)
              }, 0)

              return (
                <div key={dateStr} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  {/* Day Header */}
                  <div className="bg-secondary/45 px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span className="bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 text-3xs font-mono font-extrabold">
                        Day {idx + 1}
                      </span>
                      {format(parseISO(dateStr), 'eeee, MMM d, yyyy')}
                    </h4>
                    <span className="text-3xs font-semibold text-muted-foreground font-mono bg-card px-2 py-0.5 rounded border border-border/40">
                      Total: {totalEstDay.toFixed(1)} hrs estimated
                    </span>
                  </div>

                  {/* Day Lectures list */}
                  <div className="divide-y divide-border/40">
                    {dayItems.map((item) => {
                      const lec = item.lectures
                      if (!lec) return null
                      const mod = lec.modules
                      const sub = mod?.subjects
                      
                      const isCompleted = Number(lec.completed_hours) >= Number(lec.estimated_hours)
                      const isSliderPending = sliderMutation.isPending && sliderMutation.variables?.lectureId === lec.id

                      return (
                        <div key={item.id} className="p-5 space-y-4 hover:bg-secondary/10 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              {/* Custom Checkbox button */}
                              <button
                                onClick={() => toggleMutation.mutate({ lectureId: lec.id, isCompleted: !isCompleted })}
                                disabled={toggleMutation.isPending}
                                className="mt-0.5 text-muted-foreground hover:text-primary transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-border hover:border-primary/50 transition-colors" />
                                )}
                              </button>

                              <div>
                                <h5 className={`text-xs font-bold text-foreground ${isCompleted ? 'line-through opacity-55' : ''}`}>
                                  {lec.title}
                                </h5>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {sub && (
                                    <span
                                      className="text-4xs font-bold font-mono px-1.5 py-0.5 rounded text-card"
                                      style={{ backgroundColor: sub.color }}
                                    >
                                      {sub.name}
                                    </span>
                                  )}
                                  <span className="text-4xs font-medium text-muted-foreground">
                                    Module: {mod?.name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Completed Status rollup */}
                            <div className="text-right text-3xs font-mono">
                              <p className="text-muted-foreground">Hours Allocation</p>
                              <p className="font-bold text-foreground mt-0.5">
                                {Number(lec.completed_hours).toFixed(1)} / {Number(lec.estimated_hours).toFixed(1)} hrs
                              </p>
                            </div>
                          </div>

                          {/* Dynamic Manual Hours Completed Slider Override */}
                          <div className="pl-8 space-y-1.5 max-w-sm">
                            <div className="flex items-center justify-between text-4xs font-mono text-muted-foreground">
                              <span>Override Completed Time</span>
                              {isSliderPending && <span className="text-primary animate-pulse">Saving...</span>}
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={Number(lec.estimated_hours)}
                              step="0.1"
                              value={Number(lec.completed_hours)}
                              onChange={(e) => {
                                sliderMutation.mutate({ lectureId: lec.id, hours: parseFloat(e.target.value) })
                              }}
                              className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary border border-border/40 focus:outline-none"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSubjects, getAppStats, getProfile, updateLectureCompletedHours } from '@/actions/db'
import { getTodayRoadmap, getRoadmapDetails } from '@/actions/roadmap'
import {
  Sparkles,
  Clock,
  BookOpen,
  Calendar,
  ChevronRight,
  TrendingUp,
  Award,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { getSubjectIcon } from '@/components/subjects/SortableSubjectCard'
import { format, parseISO } from 'date-fns'
import CountdownTimer from '@/components/dashboard/CountdownTimer'
import { useBatchToggle } from '@/hooks/useBatchToggle'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  estimated_hours: number
  completed_hours: number
}

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

export default function DashboardPage() {
  // 1. Fetch user data & stats
  const { data: profile = null } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  })

  const { data: subjects = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  const queryClient = useQueryClient()

  const { data: stats = null, isLoading: loadingStats } = useQuery({
    queryKey: ['app-stats'],
    queryFn: () => getAppStats(),
  })

  // 2. Fetch active roadmap status & today's schedule
  const { data: roadmapDetails = null } = useQuery({
    queryKey: ['roadmap-status'],
    queryFn: () => getRoadmapDetails(),
  })

  const { data: todayLecturesData = [], isLoading: loadingToday } = useQuery({
    queryKey: ['today-roadmap'],
    queryFn: () => getTodayRoadmap(),
  })

  const todayLectures = todayLecturesData as unknown as RoadmapItem[]

  const { toggleLecture, syncing, syncError, retry } = useBatchToggle()

  const sliderMutation = useMutation({
    mutationFn: (variables: { lectureId: string; hours: number }) =>
      updateLectureCompletedHours(variables.lectureId, variables.hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    }
  })

  const isLoading = loadingSubs || loadingStats || loadingToday

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Derived progress calculations
  const totalHours = stats?.totalEstimated || 0
  const completedHours = stats?.totalCompleted || 0
  const progressPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0
  
  const dailyTarget = profile?.daily_target_hours || 4.0
  const hoursLeft = Math.max(totalHours - completedHours, 0)
  const daysLeft = Math.ceil(hoursLeft / dailyTarget)

  // Circular Dial SVG dimensions
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            Welcome back, {profile?.full_name || 'Tanmay Raj'} 
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is your study roadmap status for today. Keep pushing!
          </p>
        </div>
        
        <div className="text-right sm:text-right">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* GATE Countdown Timer */}
      <CountdownTimer />

      {/* 2. Overall Progress Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-4 flex-1">
            <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
              Syllabus Study Progress
            </h3>
            <div className="space-y-1">
              <p className="text-3xl font-extrabold text-foreground tracking-tight">
                {completedHours.toFixed(1)} <span className="text-sm text-muted-foreground font-normal">hours studied</span>
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Out of {totalHours.toFixed(1)} total estimated syllabus hours.
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-border/30 pt-4 text-xs font-mono">
              <div>
                <p className="text-muted-foreground text-3xs uppercase tracking-wider">Lectures</p>
                <p className="font-bold text-foreground text-sm">{stats?.completedLectures} / {stats?.totalLectures}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-3xs uppercase tracking-wider">Daily Target</p>
                <p className="font-bold text-foreground text-sm">{dailyTarget} hours</p>
              </div>
              <div>
                <p className="text-muted-foreground text-3xs uppercase tracking-wider">Target Finish</p>
                <p className="font-bold text-foreground text-sm">{daysLeft} days left</p>
              </div>
            </div>
          </div>

          {/* Premium Progress Ring Dial */}
          <div className="relative flex items-center justify-center flex-shrink-0 w-36 h-36">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-secondary fill-none"
                strokeWidth="10"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-primary fill-none transition-all duration-500 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center space-y-0.5">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{progressPercent}%</span>
              <span className="text-4xs text-muted-foreground uppercase font-mono font-bold tracking-widest">Complete</span>
            </div>
          </div>
        </div>

        {/* Stats Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xs font-extrabold uppercase text-muted-foreground tracking-wider font-mono">Hours Left</p>
              <p className="text-xl font-extrabold text-foreground">{hoursLeft.toFixed(1)} hrs</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xs font-extrabold uppercase text-muted-foreground tracking-wider font-mono">Estimated Days</p>
              <p className="text-xl font-extrabold text-foreground">{daysLeft} days remaining</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Today's Plan */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-primary" />
              Today&apos;s Plan
            </h3>
            {syncing && <span className="text-4xs text-muted-foreground animate-pulse ml-2 font-mono">Saving...</span>}
            {syncError && (
              <span className="text-4xs text-red-500 font-semibold flex items-center gap-1.5 ml-2 font-mono">
                {syncError}
                <button onClick={retry} className="text-primary hover:underline font-bold cursor-pointer">
                  Retry
                </button>
              </span>
            )}
          </div>
          <Link href="/roadmap" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
            <span>View Calendar</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {todayLectures.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border/50 rounded-xl bg-secondary/10">
            <p className="text-xs text-muted-foreground font-medium mb-1">No lectures scheduled for today.</p>
            <p className="text-3xs text-muted-foreground max-w-xs mx-auto mb-4">Configure target finish dates in the Roadmap tab to auto-generate your daily plan.</p>
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-1 bg-foreground text-background text-2xs font-bold rounded-lg px-3 py-1.5 hover:opacity-90 transition-all"
            >
              Go to Roadmap
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-secondary/5">
            {todayLectures.map((item: RoadmapItem) => {
              const lec = item.lectures
              if (!lec) return null
              const mod = lec.modules
              const sub = mod?.subjects

              const isCompleted = Number(lec.completed_hours) >= Number(lec.estimated_hours)

              return (
                <div 
                  key={item.id} 
                  className="p-4 space-y-3.5 hover:bg-secondary/10 transition-colors"
                  style={{ borderLeft: `3.5px solid ${sub?.color || 'transparent'}` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleLecture(lec.id, !isCompleted, Number(lec.estimated_hours), isCompleted)}
                        className="mt-0.5 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full border-2 border-border hover:border-primary/50 transition-colors" />
                        )}
                      </button>

                      <div>
                        <h5 className={`text-xs font-bold text-foreground ${isCompleted ? 'line-through opacity-55' : ''}`}>
                          {lec.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {sub && (
                            <span
                              className="text-5xs font-bold font-mono px-1 rounded text-card"
                              style={{ backgroundColor: sub.color }}
                            >
                              {sub.name}
                            </span>
                          )}
                          <span className="text-5xs text-muted-foreground font-medium">
                            Module: {mod?.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-4xs font-mono">
                      <p className="text-muted-foreground">Completed Time</p>
                      <p className="font-bold text-foreground mt-0.5">
                        {Number(lec.completed_hours).toFixed(1)} / {Number(lec.estimated_hours).toFixed(1)}h
                      </p>
                    </div>
                  </div>

                  <div className="pl-7 space-y-1 max-w-xs">
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
        )}
      </div>

      {/* 4. Current Roadmap Status */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-primary" />
          Current Roadmap Status
        </h3>
        
        {roadmapDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="rounded-xl border border-border/40 p-4 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Roadmap Period</span>
              <span className="font-bold text-foreground">
                {format(parseISO(roadmapDetails.roadmap.start_date), 'MMM d')} - {roadmapDetails.roadmap.target_finish_date ? format(parseISO(roadmapDetails.roadmap.target_finish_date), 'MMM d, yyyy') : 'N/A'}
              </span>
            </div>
            <div className="rounded-xl border border-border/40 p-4 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Projected Finish Date</span>
              <span className="font-bold text-primary">
                {roadmapDetails.roadmap.target_finish_date ? format(parseISO(roadmapDetails.roadmap.target_finish_date), 'eeee, MMM d, yyyy') : 'Configure'}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="rounded-xl border border-border/40 p-4 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Study Target Efficiency</span>
              <span className="font-bold text-foreground">Not Started</span>
            </div>
            <div className="rounded-xl border border-border/40 p-4 bg-secondary/15 flex items-center justify-between">
              <span className="text-muted-foreground">Projected Finish Date</span>
              <span className="font-bold text-foreground">Configure Roadmap</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Subject Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
            Subject Overview
          </h3>
          <Link href="/subjects" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
            <span>Manage Courses</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/50 rounded-xl bg-secondary/10">
            <p className="text-xs text-muted-foreground">No subjects found. Open settings or let auto-seeding finish.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((sub: Subject) => {
              const subHrs = Number(sub.estimated_hours) || 0
              const subComp = Number(sub.completed_hours) || 0
              const pct = subHrs > 0 ? Math.round((subComp / subHrs) * 100) : 0

              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-all flex flex-col justify-between min-h-[140px] shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-card shadow-sm flex-shrink-0"
                      style={{ backgroundColor: sub.color }}
                    >
                      {getSubjectIcon(sub.icon, 'h-4 w-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{sub.name}</p>
                      <p className="text-4xs text-muted-foreground font-mono">{pct}% completed</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-4">
                    <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ backgroundColor: sub.color, width: `${pct}%` }}
                      />
                    </div>
                    <Link
                      href={`/subjects/${sub.id}`}
                      className="text-4xs font-bold text-primary hover:underline block text-center"
                    >
                      Open Course Details
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

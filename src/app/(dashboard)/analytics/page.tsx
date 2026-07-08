'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubjects, getAppStats, getProfile } from '@/actions/db'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Loader2, TrendingUp, BarChart2, PieChart as PieIcon, Award, Clock, Calendar } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

interface Subject {
  id: string
  name: string
  icon: string
  color: string
  estimated_hours: number
  completed_hours: number
  display_order: number
}

export default function AnalyticsPage() {
  // 1. Fetch data
  const { data: profile = null } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  })

  const { data: subjects = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  const { data: stats = null, isLoading: loadingStats } = useQuery({
    queryKey: ['app-stats'],
    queryFn: () => getAppStats(),
  })

  const isLoading = loadingSubs || loadingStats

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <EmptyState
        title="No study data found"
        description="Initialize subjects and syllabus structure to generate study analytics reports."
      />
    )
  }

  // Derived progress calculations
  const totalHours = stats?.totalEstimated || 0
  const completedHours = stats?.totalCompleted || 0
  const progressPercent = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0
  const dailyTarget = profile?.daily_target_hours || 4.0
  const hoursLeft = Math.max(totalHours - completedHours, 0)
  const daysLeft = Math.ceil(hoursLeft / dailyTarget)

  // 2. Prepare charts data
  const barChartData = subjects.map((sub: Subject) => ({
    name: sub.name.length > 15 ? `${sub.name.substring(0, 12)}...` : sub.name,
    Estimated: Number(sub.estimated_hours),
    Completed: Number(sub.completed_hours),
  }))

  const pieChartData = subjects.map((sub: Subject) => ({
    name: sub.name,
    value: Number(sub.estimated_hours),
    color: sub.color,
  })).filter(item => item.value > 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Analyze study metrics, syllabus completion status, and projected timelines.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-3xs font-extrabold uppercase tracking-wider font-mono">Progress Rate</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{progressPercent}%</p>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-3xs font-extrabold uppercase tracking-wider font-mono">Total Studied</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{completedHours.toFixed(1)} hrs</p>
          <p className="text-4xs text-muted-foreground font-mono">Out of {totalHours.toFixed(1)} total hours</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-3xs font-extrabold uppercase tracking-wider font-mono">Days Remaining</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{daysLeft} days</p>
          <p className="text-4xs text-muted-foreground font-mono">Based on {dailyTarget}h daily target</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-3xs font-extrabold uppercase tracking-wider font-mono">Lectures Completed</span>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground">{stats?.completedLectures}</p>
          <p className="text-4xs text-muted-foreground font-mono">Out of {stats?.totalLectures} lectures</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Estimated vs Completed bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
            <BarChart2 className="h-4.5 w-4.5 text-primary" />
            Subject Hours Allocation (Estimated vs Completed)
          </h3>
          <div className="h-80 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" />
                <YAxis stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  labelClassName="text-foreground font-bold font-sans"
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="Completed" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Estimated" fill="var(--muted-foreground)" opacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Syllabus breakdown pie chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
            <PieIcon className="h-4.5 w-4.5 text-primary" />
            Syllabus Weightage by Subject (Hours)
          </h3>
          {pieChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic min-h-[250px]">
              No hours estimated.
            </div>
          ) : (
            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '10px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center space-y-0.5 pointer-events-none">
                <span className="text-xl font-extrabold text-foreground tracking-tight">{subjects.length}</span>
                <span className="text-4xs text-muted-foreground uppercase font-mono font-bold tracking-widest">Subjects</span>
              </div>
            </div>
          )}

          {/* Simple custom legend */}
          <div className="max-h-24 overflow-y-auto space-y-1.5 border-t border-border/30 pt-3 text-3xs font-mono">
            {pieChartData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground truncate flex-1">{entry.name}</span>
                <span className="text-foreground font-semibold">{entry.value.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

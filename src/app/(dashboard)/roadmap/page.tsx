'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { generateRoadmap, getRoadmapDetails } from '@/actions/roadmap'
import { reorderRoadmapItem } from '@/actions/db'
import { useBatchToggle } from '@/hooks/useBatchToggle'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Check,
  GripVertical
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

interface SortableRoadmapItemProps {
  item: RoadmapItem
  isCompleted: boolean
  toggleLecture: (lectureId: string, isCompleted: boolean, estimatedHours: number, currentCompleted: boolean) => void
  subColor: string
}

const SortableRoadmapItem = React.memo(function SortableRoadmapItem({
  item,
  isCompleted,
  toggleLecture,
  subColor
}: SortableRoadmapItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'item',
      item,
    }
  })

  const lec = item.lectures
  if (!lec) return null

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    borderLeft: `3.5px solid ${subColor}`,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-5 flex items-start justify-between gap-4 hover:bg-secondary/10 transition-all bg-card"
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 text-muted-foreground/35 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reschedule"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => toggleLecture(lec.id, !isCompleted, Number(lec.estimated_hours), isCompleted)}
          className="mt-0.5 text-muted-foreground hover:text-primary transition-all cursor-pointer flex-shrink-0"
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
            {lec.modules?.subjects && (
              <span
                className="text-4xs font-bold font-mono px-1.5 py-0.5 rounded border"
                style={{ 
                  backgroundColor: `${lec.modules.subjects.color}15`,
                  borderColor: `${lec.modules.subjects.color}35`,
                  color: lec.modules.subjects.color
                }}
              >
                {lec.modules.subjects.name}
              </span>
            )}
            <span className="text-4xs font-medium text-muted-foreground">
              Module: {lec.modules?.name}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right text-3xs font-mono flex-shrink-0">
        <p className="text-muted-foreground">Allocation</p>
        <p className="font-bold text-foreground mt-0.5">
          {Number(item.completed_hours).toFixed(1)} / {Number(lec.estimated_hours).toFixed(1)} hrs
        </p>
      </div>
    </div>
  )
})

interface DayContainerProps {
  dayId: string
  dateStr: string
  totalEstDay: number
  idx: number
  children: React.ReactNode
}

function DayContainer({ dayId, dateStr, totalEstDay, idx, children }: DayContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayId,
  })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border bg-card overflow-hidden shadow-sm transition-all duration-150 ${
        isOver ? 'ring-2 ring-primary border-primary/40 bg-secondary/5' : 'border-border'
      }`}
    >
      {/* Day Header */}
      <div className="bg-secondary/45 px-5 py-3.5 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
          <span className="bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 text-3xs font-mono font-extrabold">
            Day {idx + 1}
          </span>
          {format(parseISO(dateStr), 'EEEE, MMM d, yyyy')}
        </h4>
        <span className="text-3xs font-semibold text-muted-foreground font-mono bg-card px-2 py-0.5 rounded border border-border/40">
          Total: {totalEstDay.toFixed(1)} hrs estimated
        </span>
      </div>

      {/* Day Lectures list */}
      <div className="divide-y divide-border/40 min-h-[60px] bg-secondary/5">
        {children}
      </div>
    </div>
  )
}

export default function RoadmapPage() {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [localItems, setLocalItems] = useState<RoadmapItem[]>([])
  const [plannedDates, setPlannedDates] = useState<string[]>([])
  const [dayIdToDateMap, setDayIdToDateMap] = useState<Record<string, string>>({})

  // 1. Fetch roadmap data
  const { data: roadmapData = null, isLoading } = useQuery({
    queryKey: ['roadmap'],
    queryFn: () => getRoadmapDetails(),
  })

  useEffect(() => {
    if (roadmapData?.items) {
      const rItems = roadmapData.items as unknown as RoadmapItem[]
      setLocalItems(rItems)
      
      const dates = Array.from(
        new Set(rItems.map((item) => item.scheduled_date))
      ).sort((a, b) => a.localeCompare(b)) as string[]
      setPlannedDates(dates)

      const map: Record<string, string> = {}
      rItems.forEach((item) => {
        map[item.roadmap_id] = item.scheduled_date
      })
      setDayIdToDateMap(map)
    }
  }, [roadmapData])

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

  const reorderMutation = useMutation({
    mutationFn: (variables: { itemId: string; targetRoadmapDayId: string; targetOrder: number }) =>
      reorderRoadmapItem(variables.itemId, variables.targetRoadmapDayId, variables.targetOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['today-roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
    }
  })

  const { toggleLecture, syncing, syncError, retry } = useBatchToggle()

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeItem = localItems.find((item) => item.id === activeId)
    if (!activeItem) return

    let targetDayId = ''
    let targetOrder = 0

    const overItem = localItems.find((item) => item.id === overId)
    if (overItem) {
      targetDayId = overItem.roadmap_id
      const targetDayItems = localItems
        .filter((item) => item.roadmap_id === targetDayId && item.id !== activeId)
        .sort((a, b) => a.study_order - b.study_order)

      const overIdx = targetDayItems.findIndex((item) => item.id === overId)
      targetOrder = overIdx !== -1 ? overIdx : targetDayItems.length
    } else {
      // overId is the day container ID
      targetDayId = overId
      targetOrder = 0
    }

    const otherItems = localItems.filter((item) => item.id !== activeId)
    const sourceDayId = activeItem.roadmap_id

    if (sourceDayId !== targetDayId) {
      const sourceItems = otherItems
        .filter((item) => item.roadmap_id === sourceDayId)
        .sort((a, b) => a.study_order - b.study_order)
        .map((item, idx) => ({ ...item, study_order: idx }))

      const targetItems = otherItems
        .filter((item) => item.roadmap_id === targetDayId)
        .sort((a, b) => a.study_order - b.study_order)

      targetItems.splice(targetOrder, 0, { ...activeItem, roadmap_id: targetDayId })
      const updatedTargetItems = targetItems.map((item, idx) => ({ ...item, study_order: idx }))

      const restItems = otherItems.filter(
        (item) => item.roadmap_id !== sourceDayId && item.roadmap_id !== targetDayId
      )

      const newDate = dayIdToDateMap[targetDayId] || activeItem.scheduled_date

      const finalItems = [
        ...restItems,
        ...sourceItems,
        ...updatedTargetItems.map((item) =>
          item.id === activeId ? { ...item, scheduled_date: newDate } : item
        )
      ]
      setLocalItems(finalItems)
    } else {
      const dayItems = otherItems
        .filter((item) => item.roadmap_id === targetDayId)
        .sort((a, b) => a.study_order - b.study_order)

      dayItems.splice(targetOrder, 0, activeItem)
      const updatedDayItems = dayItems.map((item, idx) => ({ ...item, study_order: idx }))

      const restItems = otherItems.filter((item) => item.roadmap_id !== targetDayId)
      setLocalItems([...restItems, ...updatedDayItems])
    }

    try {
      await reorderMutation.mutateAsync({
        itemId: activeId,
        targetRoadmapDayId: targetDayId,
        targetOrder,
      })
    } catch {
      // rollback handled by react query automatically
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Group items by scheduled_date
  const grouped: Record<string, RoadmapItem[]> = {}
  localItems.forEach((item) => {
    const d = item.scheduled_date
    grouped[d] = grouped[d] || []
    grouped[d].push(item)
  })

  // Ensure all planned dates exist in grouped
  plannedDates.forEach((dateStr) => {
    if (!grouped[dateStr]) {
      grouped[dateStr] = []
    }
  })

  // Sort dates ascending
  const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  return (
    <div className="space-y-8 pb-12">
      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Syllabus Study Roadmap</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage your target milestones.
          </p>
        </div>

        {roadmapData && (
          <button
            onClick={handleRecalculate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-secondary font-medium px-4 py-2 text-xs cursor-pointer shadow transition-all disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>Regenerate Roadmap</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs font-semibold text-primary flex items-center gap-2 font-mono">
          <Check className="h-4.5 w-4.5 text-primary" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-semibold text-destructive flex items-center gap-2 font-mono">
          <AlertCircle className="h-4.5 w-4.5 text-destructive" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Setup Form if no roadmap */}
      {!roadmapData ? (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 max-w-xl mx-auto shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-foreground">Generate Your Dynamic Roadmap</h3>
            <p className="text-xs text-muted-foreground">
              Define your start date to distribute lectures. Enforces daily limits and priority order.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                Roadmap Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full rounded-lg bg-foreground text-background font-bold px-4 py-2 hover:opacity-90 active:scale-95 transition-all text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Generate Roadmap</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary status bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-secondary/15 border border-border/50 rounded-2xl p-5 shadow-2xs">
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider font-semibold">Start Date</p>
              <p className="font-bold text-foreground text-sm mt-1 font-mono">
                {format(parseISO(roadmapData.roadmap.start_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider font-semibold">Target Finish</p>
              <p className="font-bold text-foreground text-sm mt-1 font-mono">
                {format(parseISO(roadmapData.roadmap.target_finish_date), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider font-semibold">Daily Target</p>
              <p className="font-bold text-foreground text-sm mt-1 font-mono">
                {roadmapData.roadmap.daily_target_hours} hrs/day
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-3xs uppercase tracking-wider font-semibold">Lectures Left</p>
              <p className="font-bold text-foreground text-sm mt-1 font-mono">
                {localItems.filter((item) => {
                  const lec = item.lectures
                  return lec ? Number(lec.completed_hours) < Number(lec.estimated_hours) : false
                }).length} remaining
              </p>
            </div>
          </div>

          {/* Grouped Calendar Days */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
                Daily Schedule View
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

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="space-y-6">
                {sortedDates.map((dateStr, idx) => {
                  const dayItems = grouped[dateStr]
                  const dayId = dayItems[0]?.roadmap_id || `empty-day-${dateStr}`
                  const totalEstDay = dayItems.reduce((sum, item) => {
                    const lec = item.lectures
                    return sum + (Number(lec?.estimated_hours) || 0)
                  }, 0)

                  return (
                    <DayContainer key={dateStr} dayId={dayId} dateStr={dateStr} totalEstDay={totalEstDay} idx={idx}>
                      <SortableContext items={dayItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        {dayItems.length === 0 ? (
                          <div className="p-6 text-center text-3xs text-muted-foreground font-medium italic border border-dashed border-border/40 rounded-xl m-3 bg-secondary/5">
                            No lectures scheduled for this day. Drag items here.
                          </div>
                        ) : (
                          dayItems.map((item) => {
                            const lec = item.lectures
                            if (!lec) return null
                            const mod = lec.modules
                            const sub = mod?.subjects
                            const isCompleted = Number(lec.completed_hours) >= Number(lec.estimated_hours)

                            return (
                              <SortableRoadmapItem
                                key={item.id}
                                item={item}
                                isCompleted={isCompleted}
                                toggleLecture={toggleLecture}
                                subColor={sub?.color || 'transparent'}
                              />
                            )
                          })
                        )}
                      </SortableContext>
                    </DayContainer>
                  )
                })}
              </div>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRef, useState, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { batchToggleLectures } from '@/actions/db'

export function useBatchToggle(
  subjectId?: string,
  options?: { onSuccess?: () => void; onError?: (err: Error) => void }
) {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const bufferRef = useRef<
    Record<
      string,
      {
        isCompleted: boolean
        estimatedHours: number
        originalCompleted: boolean
      }
    >
  >({})

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const mutation = useMutation({
    mutationFn: (updates: Array<{ id: string; isCompleted: boolean }>) => batchToggleLectures(updates),
    onMutate: async (updates) => {
      setSyncing(true)
      setSyncError(null)

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['today-roadmap'] })
      await queryClient.cancelQueries({ queryKey: ['roadmap'] })
      await queryClient.cancelQueries({ queryKey: ['subjects'] })
      await queryClient.cancelQueries({ queryKey: ['app-stats'] })
      if (subjectId) {
        await queryClient.cancelQueries({ queryKey: ['subject-detail', subjectId] })
      }

      // Snapshot previous values
      const prevToday = queryClient.getQueryData(['today-roadmap'])
      const prevRoadmap = queryClient.getQueryData(['roadmap'])
      const prevSubjects = queryClient.getQueryData(['subjects'])
      const prevStats = queryClient.getQueryData(['app-stats'])
      const prevSubjectDetail = subjectId ? queryClient.getQueryData(['subject-detail', subjectId]) : null

      // Optimistically update caches
      updates.forEach((update) => {
        const itemInfo = bufferRef.current[update.id]
        if (!itemInfo) return

        const { estimatedHours, originalCompleted } = itemInfo
        const diffHrs = (update.isCompleted ? estimatedHours : 0) - (originalCompleted ? estimatedHours : 0)
        const diffCount = (update.isCompleted ? 1 : 0) - (originalCompleted ? 1 : 0)

        // 1. Update Today Roadmap Cache
        queryClient.setQueryData(['today-roadmap'], (old: unknown) => {
          if (!Array.isArray(old)) return old
          return old.map((item: unknown) => {
            const typedItem = item as { lecture_id: string; lectures?: { completed_hours: number } }
            if (typedItem.lecture_id === update.id && typedItem.lectures) {
              return {
                ...typedItem,
                completed: update.isCompleted,
                lectures: {
                  ...typedItem.lectures,
                  completed_hours: update.isCompleted ? estimatedHours : 0
                }
              }
            }
            return typedItem
          })
        })

        // 2. Update Roadmap Cache
        queryClient.setQueryData(['roadmap'], (old: unknown) => {
          const typedOld = old as { items?: Array<{ lecture_id: string; completed_hours: number; lectures?: { completed_hours: number } }> } | null
          if (!typedOld || !Array.isArray(typedOld.items)) return old
          return {
            ...typedOld,
            items: typedOld.items.map((item) => {
              if (item.lecture_id === update.id && item.lectures) {
                return {
                  ...item,
                  completed_hours: update.isCompleted ? estimatedHours : 0,
                  lectures: {
                    ...item.lectures,
                    completed_hours: update.isCompleted ? estimatedHours : 0
                  }
                }
              }
              return item
            })
          }
        })

        // 3. Update Subject Detail Cache
        if (subjectId) {
          queryClient.setQueryData(['subject-detail', subjectId], (old: unknown) => {
            const typedOld = old as { modules?: Array<{ id: string; completed_hours: number; lectures: Array<{ id: string; completed_hours: number; estimated_hours: number }> }> } | null
            if (!typedOld || !Array.isArray(typedOld.modules)) return old
            
            let newCompletedHours = 0
            const updatedModules = typedOld.modules.map((mod) => {
              const updatedLectures = mod.lectures.map((lec) => {
                if (lec.id === update.id) {
                  return {
                    ...lec,
                    completed_hours: update.isCompleted ? estimatedHours : 0
                  }
                }
                return lec
              })
              
              const modCompletedHours = updatedLectures.reduce((sum, l) => sum + (Number(l.completed_hours) || 0), 0)
              newCompletedHours += modCompletedHours

              return {
                ...mod,
                completed_hours: modCompletedHours,
                lectures: updatedLectures
              }
            })

            return {
              ...typedOld,
              completed_hours: newCompletedHours,
              modules: updatedModules
            }
          })
        }

        // 4. Update Stats Cache
        queryClient.setQueryData(['app-stats'], (old: unknown) => {
          const typedOld = old as { totalCompleted?: number; completedLectures?: number } | null
          if (!typedOld) return old
          return {
            ...typedOld,
            totalCompleted: Math.max(0, (typedOld.totalCompleted || 0) + diffHrs),
            completedLectures: Math.max(0, (typedOld.completedLectures || 0) + diffCount)
          }
        })
      })

      return { prevToday, prevRoadmap, prevSubjects, prevStats, prevSubjectDetail }
    },
    onError: (err, updates, context: unknown) => {
      setSyncing(false)
      setSyncError('Sync failed. Retrying...')
      
      const ctx = context as {
        prevToday: unknown
        prevRoadmap: unknown
        prevSubjects: unknown
        prevStats: unknown
        prevSubjectDetail: unknown
      } | undefined

      if (ctx) {
        queryClient.setQueryData(['today-roadmap'], ctx.prevToday)
        queryClient.setQueryData(['roadmap'], ctx.prevRoadmap)
        queryClient.setQueryData(['subjects'], ctx.prevSubjects)
        queryClient.setQueryData(['app-stats'], ctx.prevStats)
        if (subjectId) {
          queryClient.setQueryData(['subject-detail', subjectId], ctx.prevSubjectDetail)
        }
      }
      
      if (options?.onError) {
        options.onError(err)
      }
    },
    onSuccess: () => {
      setSyncing(false)
      setSyncError(null)
      bufferRef.current = {}
      
      queryClient.invalidateQueries({ queryKey: ['today-roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['app-stats'] })
      if (subjectId) {
        queryClient.invalidateQueries({ queryKey: ['subject-detail', subjectId] })
      }

      if (options?.onSuccess) {
        options.onSuccess()
      }
    }
  })

  const toggleLecture = (lectureId: string, isCompleted: boolean, estimatedHours: number, currentCompleted: boolean) => {
    if (!bufferRef.current[lectureId]) {
      bufferRef.current[lectureId] = {
        isCompleted,
        estimatedHours,
        originalCompleted: currentCompleted
      }
    } else {
      bufferRef.current[lectureId].isCompleted = isCompleted
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Optimistically update today-roadmap and roadmap right away
    queryClient.setQueryData(['today-roadmap'], (old: unknown) => {
      if (!Array.isArray(old)) return old
      return old.map((item: unknown) => {
        const typedItem = item as { lecture_id: string; lectures?: { completed_hours: number } }
        if (typedItem.lecture_id === lectureId && typedItem.lectures) {
          return {
            ...typedItem,
            completed: isCompleted,
            lectures: {
              ...typedItem.lectures,
              completed_hours: isCompleted ? estimatedHours : 0
            }
          }
        }
        return item
      })
    })

    queryClient.setQueryData(['roadmap'], (old: unknown) => {
      const typedOld = old as { items?: Array<{ lecture_id: string; completed_hours: number; lectures?: { completed_hours: number } }> } | null
      if (!typedOld || !Array.isArray(typedOld.items)) return old
      return {
        ...typedOld,
        items: typedOld.items.map((item) => {
          if (item.lecture_id === lectureId && item.lectures) {
            return {
              ...item,
              completed_hours: isCompleted ? estimatedHours : 0,
              lectures: {
                ...item.lectures,
                completed_hours: isCompleted ? estimatedHours : 0
              }
            }
          }
          return item
        })
      }
    })

    if (subjectId) {
      queryClient.setQueryData(['subject-detail', subjectId], (old: unknown) => {
        const typedOld = old as { modules?: Array<{ id: string; completed_hours: number; lectures: Array<{ id: string; completed_hours: number; estimated_hours: number }> }> } | null
        if (!typedOld || !Array.isArray(typedOld.modules)) return old
        
        let newCompletedHours = 0
        const updatedModules = typedOld.modules.map((mod) => {
          const updatedLectures = mod.lectures.map((lec) => {
            if (lec.id === lectureId) {
              return {
                ...lec,
                completed_hours: isCompleted ? estimatedHours : 0
              }
            }
            return lec
          })
          
          const modCompletedHours = updatedLectures.reduce((sum, l) => sum + (Number(l.completed_hours) || 0), 0)
          newCompletedHours += modCompletedHours

          return {
            ...mod,
            completed_hours: modCompletedHours,
            lectures: updatedLectures
          }
        })

        return {
          ...typedOld,
          completed_hours: newCompletedHours,
          modules: updatedModules
        }
      })
    }

    debounceTimerRef.current = setTimeout(() => {
      const updates = Object.entries(bufferRef.current)
        .filter((entry) => entry[1].isCompleted !== entry[1].originalCompleted)
        .map(([id, info]) => ({ id, isCompleted: info.isCompleted }))

      if (updates.length > 0) {
        mutation.mutate(updates)
      } else {
        bufferRef.current = {}
      }
    }, 1000)
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    toggleLecture,
    syncing,
    syncError,
    retry: () => {
      const updates = Object.entries(bufferRef.current).map(([id, info]) => ({
        id,
        isCompleted: info.isCompleted
      }))
      if (updates.length > 0) {
        mutation.mutate(updates)
      }
    }
  }
}

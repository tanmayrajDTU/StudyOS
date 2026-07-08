'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays, format, parseISO } from 'date-fns'
import { SupabaseClient } from '@supabase/supabase-js'

// Helper to assert user auth
async function getAuthUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.email !== 'tanmayraj1705@gmail.com') throw new Error('Unauthorized account')
  return user
}

export async function generateRoadmap(startDateStr: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // 1. Get profile daily target
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_target_hours')
    .eq('id', user.id)
    .single()

  const dailyTarget = Number(profile?.daily_target_hours) || 4.0

  // 2. Delete existing roadmap (cascade drops roadmap_items)
  await supabase
    .from('roadmap')
    .delete()
    .eq('user_id', user.id)

  // 3. Insert new roadmap base
  const { data: newRoadmap, error: roadmapErr } = await supabase
    .from('roadmap')
    .insert({
      user_id: user.id,
      start_date: startDateStr,
      daily_target_hours: dailyTarget,
    })
    .select()
    .single()

  if (roadmapErr || !newRoadmap) throw roadmapErr

  // 4. Fetch all subjects, modules, and incomplete lectures
  // In order: subject display_order -> module display_order -> lecture display_order
  const { data: lecturesData, error: lecErr } = await supabase
    .from('lectures')
    .select(`
      id,
      title,
      estimated_hours,
      completed_hours,
      display_order,
      module_id,
      modules (
        id,
        display_order,
        subject_id,
        subjects (
          id,
          display_order
        )
      )
    `)

  if (lecErr || !lecturesData) throw lecErr

  // Filter out complete lectures and sort dynamically
  const incompleteLectures = lecturesData
    .filter((l) => Number(l.completed_hours) < Number(l.estimated_hours))
    .map((l) => {
      const modObj = Array.isArray(l.modules) ? l.modules[0] : l.modules
      const mod = modObj as { display_order: number; subjects: unknown } | null
      const sub = (Array.isArray(mod?.subjects) ? mod?.subjects[0] : mod?.subjects) as { display_order: number } | null
      return {
        id: l.id,
        estimated_hours: Number(l.estimated_hours),
        subjectOrder: sub?.display_order ?? 0,
        moduleOrder: mod?.display_order ?? 0,
        lectureOrder: l.display_order ?? 0,
      }
    })
    .sort((a, b) => {
      if (a.subjectOrder !== b.subjectOrder) return a.subjectOrder - b.subjectOrder
      if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder
      return a.lectureOrder - b.lectureOrder
    })

  // 5. Bin-packing scheduling algorithm
  let currentDate = parseISO(startDateStr)
  let currentAccumulator = 0.0
  const scheduledItems: Array<{
    roadmap_id: string
    lecture_id: string
    scheduled_date: string
    study_order: number
    completed_hours: number
  }> = []

  let studyOrder = 0

  for (const lec of incompleteLectures) {
    const hours = lec.estimated_hours

    if (currentAccumulator + hours > dailyTarget) {
      // If we already scheduled something today, move to next day
      if (currentAccumulator > 0) {
        currentDate = addDays(currentDate, 1)
        currentAccumulator = 0.0
      }
    }

    scheduledItems.push({
      roadmap_id: newRoadmap.id,
      lecture_id: lec.id,
      scheduled_date: format(currentDate, 'yyyy-MM-dd'),
      study_order: studyOrder++,
      completed_hours: 0.00,
    })

    currentAccumulator += hours

    // If this lecture alone exceeds the daily target, the next lecture must go to the next day
    if (currentAccumulator >= dailyTarget) {
      currentDate = addDays(currentDate, 1)
      currentAccumulator = 0.0
    }
  }

  // 6. Batch insert scheduled items
  if (scheduledItems.length > 0) {
    const { error: insertErr } = await supabase
      .from('roadmap_items')
      .insert(scheduledItems)

    if (insertErr) throw insertErr
  }

  // 7. Update roadmap with target finish date
  const finishDateStr = format(currentDate, 'yyyy-MM-dd')
  await supabase
    .from('roadmap')
    .update({ target_finish_date: finishDateStr })
    .eq('id', newRoadmap.id)

  revalidatePath('/')
  revalidatePath('/roadmap')
  return { success: true, finishDate: finishDateStr, itemsCount: scheduledItems.length }
}

export async function getRoadmapDetails() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // Get active roadmap
  const { data: roadmap } = await supabase
    .from('roadmap')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!roadmap) return null

  // Get roadmap items
  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select(`
      *,
      lectures (
        id,
        title,
        estimated_hours,
        completed_hours,
        modules (
          id,
          name,
          subjects (
            id,
            name,
            color
          )
        )
      )
    `)
    .eq('roadmap_id', roadmap.id)
    .order('study_order', { ascending: true })

  if (error) throw error

  return {
    roadmap,
    items: items || [],
  }
}

export async function getTodayRoadmap() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { data: roadmap } = await supabase
    .from('roadmap')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!roadmap) return []

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select(`
      *,
      lectures (
        id,
        title,
        estimated_hours,
        completed_hours,
        modules (
          id,
          name,
          subjects (
            id,
            name,
            color
          )
        )
      )
    `)
    .eq('roadmap_id', roadmap.id)
    .eq('scheduled_date', todayStr)
    .order('study_order', { ascending: true })

  if (error) throw error
  return items || []
}

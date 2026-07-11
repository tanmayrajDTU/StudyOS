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

  // 1. Fetch user subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (!subjects || subjects.length === 0) {
    throw new Error('No subjects found to generate roadmap for. Please add subjects first.')
  }
  const subjectIds = subjects.map((s) => s.id)

  // Fetch daily target hours
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_target_hours')
    .eq('id', user.id)
    .single()

  const dailyTarget = Number(profile?.daily_target_hours) || 8.0
  const maxTarget = dailyTarget + 0.5
  const minTarget = dailyTarget - 0.5

  // 2. Delete existing roadmap days for the user's subjects (cascades to roadmap_items)
  await supabase
    .from('roadmap')
    .delete()
    .in('subject_id', subjectIds)

  // 3. Fetch all lectures
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
        subject_id
      )
    `)

  if (lecErr || !lecturesData) throw lecErr

  // 4. Filter out completed lectures and map them
  const incompleteLectures = lecturesData
    .filter((l) => {
      const rawMod = Array.isArray(l.modules) ? l.modules[0] : l.modules
      const mod = rawMod as { id: string; display_order: number; subject_id: string } | null
      return mod && subjectIds.includes(mod.subject_id) && Number(l.completed_hours) < Number(l.estimated_hours)
    })
    .map((l) => {
      const rawMod = Array.isArray(l.modules) ? l.modules[0] : l.modules
      const mod = rawMod as { id: string; display_order: number; subject_id: string }
      return {
        id: l.id,
        estimated_hours: Number(l.estimated_hours),
        subject_id: mod.subject_id,
        moduleOrder: mod.display_order ?? 0,
        lectureOrder: l.display_order ?? 0,
      }
    })

  // Sort them: one subject at a time, keeping order of subjects -> modules -> lectures
  const subjectOrderMap = new Map(subjects.map((s) => [s.id, s.display_order]))
  incompleteLectures.sort((a, b) => {
    const aSubOrder = subjectOrderMap.get(a.subject_id) ?? 0
    const bSubOrder = subjectOrderMap.get(b.subject_id) ?? 0
    if (aSubOrder !== bSubOrder) return aSubOrder - bSubOrder
    if (a.moduleOrder !== b.moduleOrder) return a.moduleOrder - b.moduleOrder
    return a.lectureOrder - b.lectureOrder
  })

  // Group lectures by subject (enforcing one subject at a time)
  const subjectsWithLectures: Array<{ subjectId: string; lectures: typeof incompleteLectures }> = []
  let currentSubId = ''
  let currentGroup: typeof incompleteLectures = []

  for (const lec of incompleteLectures) {
    if (lec.subject_id !== currentSubId) {
      if (currentGroup.length > 0) {
        subjectsWithLectures.push({ subjectId: currentSubId, lectures: currentGroup })
      }
      currentSubId = lec.subject_id
      currentGroup = []
    }
    currentGroup.push(lec)
  }
  if (currentGroup.length > 0) {
    subjectsWithLectures.push({ subjectId: currentSubId, lectures: currentGroup })
  }

  // 5. Pack lectures into daily bins (Target: 8h, Min: 7.5h, Max: 8.5h)
  let currentDateObj = parseISO(startDateStr)
  let totalItemsScheduled = 0

  for (const subGroup of subjectsWithLectures) {
    const subId = subGroup.subjectId
    const subLecs = subGroup.lectures

    let subjectDayIdx = 1
    let dayAccumulator = 0.0
    let dayItems: Array<{ lectureId: string; hours: number }> = []

    const saveDay = async (plannedDate: Date, dayNum: number, items: typeof dayItems) => {
      const formattedDate = format(plannedDate, 'yyyy-MM-dd')
      const totalPlannedHours = items.reduce((sum, item) => sum + item.hours, 0)
      
      const { data: roadmapDay, error: rErr } = await supabase
        .from('roadmap')
        .insert({
          subject_id: subId,
          day_number: dayNum,
          planned_hours: totalPlannedHours,
          planned_date: formattedDate
        })
        .select()
        .single()

      if (rErr || !roadmapDay) throw rErr

      const roadmapItemsToInsert = items.map((item, idx) => ({
        roadmap_day_id: roadmapDay.id,
        lecture_id: item.lectureId,
        planned_hours: item.hours,
        display_order: idx,
        completed: false
      }))

      const { error: riErr } = await supabase
        .from('roadmap_items')
        .insert(roadmapItemsToInsert)

      if (riErr) throw riErr
      totalItemsScheduled += items.length
    }

    for (let i = 0; i < subLecs.length; i++) {
      const lec = subLecs[i]
      let lecHoursLeft = lec.estimated_hours

      while (lecHoursLeft > 0) {
        const remainingSpace = maxTarget - dayAccumulator

        if (remainingSpace <= 0.01) {
          await saveDay(currentDateObj, subjectDayIdx, dayItems)
          currentDateObj = addDays(currentDateObj, 1)
          subjectDayIdx++
          dayAccumulator = 0.0
          dayItems = []
          continue
        }

        if (lecHoursLeft <= remainingSpace) {
          dayItems.push({ lectureId: lec.id, hours: lecHoursLeft })
          dayAccumulator += lecHoursLeft
          lecHoursLeft = 0
        } else {
          // If the day already has at least minTarget hours scheduled, we close it and move the rest to tomorrow
          if (dayAccumulator >= minTarget) {
            await saveDay(currentDateObj, subjectDayIdx, dayItems)
            currentDateObj = addDays(currentDateObj, 1)
            subjectDayIdx++
            dayAccumulator = 0.0
            dayItems = []
          } else {
            // Fill the day up to exactly dailyTarget hours
            const fillHours = dailyTarget - dayAccumulator
            dayItems.push({ lectureId: lec.id, hours: fillHours })
            lecHoursLeft -= fillHours

            await saveDay(currentDateObj, subjectDayIdx, dayItems)
            currentDateObj = addDays(currentDateObj, 1)
            subjectDayIdx++
            dayAccumulator = 0.0
            dayItems = []
          }
        }
      }
    }

    // Save final day of this subject
    if (dayItems.length > 0) {
      await saveDay(currentDateObj, subjectDayIdx, dayItems)
      // Increment date for the start of the next subject
      currentDateObj = addDays(currentDateObj, 1)
    }
  }

  // Target finish date is the last scheduled day (adjusting for the final loop increment)
  const finalFinishDate = format(addDays(currentDateObj, -1), 'yyyy-MM-dd')

  revalidatePath('/')
  revalidatePath('/roadmap')
  return { success: true, finishDate: finalFinishDate, itemsCount: totalItemsScheduled }
}

export async function getRoadmapDetails() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // 1. Get subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id')
    .eq('user_id', user.id)

  const subjectIds = subjects?.map((s) => s.id) || []
  if (subjectIds.length === 0) return null

  // 2. Get roadmap days
  const { data: roadmaps } = await supabase
    .from('roadmap')
    .select('*')
    .in('subject_id', subjectIds)
    .order('planned_date', { ascending: true })

  if (!roadmaps || roadmaps.length === 0) return null

  const firstPlannedDate = roadmaps[0].planned_date
  const lastPlannedDate = roadmaps[roadmaps.length - 1].planned_date
  const dateMap = new Map(roadmaps.map((r) => [r.id, r.planned_date]))

  // 3. Get profile daily target
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_target_hours')
    .eq('id', user.id)
    .single()

  const dailyTarget = Number(profile?.daily_target_hours) || 8.0

  // 4. Get items
  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select(`
      *,
      lectures (
        id,
        title,
        estimated_hours,
        completed_hours,
        importance_level,
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
    .in('roadmap_day_id', roadmaps.map((r) => r.id))
    .order('display_order', { ascending: true })

  if (error) throw error

  const mappedItems = (items || []).map((item) => ({
    id: item.id,
    roadmap_id: item.roadmap_day_id,
    lecture_id: item.lecture_id,
    scheduled_date: dateMap.get(item.roadmap_day_id) || '',
    study_order: item.display_order,
    completed_hours: item.completed ? Number(item.planned_hours || 0) : 0,
    lectures: item.lectures ? {
      ...item.lectures,
      estimated_hours: Number(item.planned_hours || 0),
      completed_hours: item.completed ? Number(item.planned_hours || 0) : 0
    } : null
  }))

  return {
    roadmap: {
      id: 'active-roadmap',
      start_date: firstPlannedDate,
      target_finish_date: lastPlannedDate,
      daily_target_hours: dailyTarget
    },
    items: mappedItems
  }
}

export async function getTodayRoadmap() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // 1. Get subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id')
    .eq('user_id', user.id)

  const subjectIds = subjects?.map((s) => s.id) || []
  if (subjectIds.length === 0) return []

  // 2. Get roadmap days scheduled for today
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const { data: roadmapDays } = await supabase
    .from('roadmap')
    .select('*')
    .in('subject_id', subjectIds)
    .eq('planned_date', todayStr)

  if (!roadmapDays || roadmapDays.length === 0) return []
  const roadmapDayIds = roadmapDays.map((d) => d.id)

  const dateMap = new Map(roadmapDays.map((r) => [r.id, r.planned_date]))

  // 3. Get items
  const { data: items, error } = await supabase
    .from('roadmap_items')
    .select(`
      *,
      lectures (
        id,
        title,
        estimated_hours,
        completed_hours,
        importance_level,
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
    .in('roadmap_day_id', roadmapDayIds)
    .order('display_order', { ascending: true })

  if (error) throw error

  return (items || []).map((item) => ({
    id: item.id,
    roadmap_id: item.roadmap_day_id,
    lecture_id: item.lecture_id,
    scheduled_date: dateMap.get(item.roadmap_day_id) || '',
    study_order: item.display_order,
    completed_hours: item.completed ? Number(item.planned_hours || 0) : 0,
    lectures: item.lectures ? {
      ...item.lectures,
      estimated_hours: Number(item.planned_hours || 0),
      completed_hours: item.completed ? Number(item.planned_hours || 0) : 0
    } : null
  }))
}

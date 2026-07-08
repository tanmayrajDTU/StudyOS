'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

// Helper to assert user auth
async function getAuthUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.email !== 'tanmayraj1705@gmail.com') throw new Error('Unauthorized account')
  return user
}

function getSubjectIdFromRelation(relationData: unknown): string | undefined {
  if (!relationData) return undefined
  if (Array.isArray(relationData)) {
    return (relationData[0] as { subject_id: string })?.subject_id
  }
  return (relationData as { subject_id: string })?.subject_id
}

async function logActivity(supabase: SupabaseClient, actionType: string, description: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('activity_log').insert({
    user_id: user.id,
    action_type: actionType,
    description: description,
    created_at: new Date().toISOString()
  })
}

// ==========================================
// 1. SUBJECTS ACTIONS
// ==========================================

export async function getSubjects() {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw error
  return data
}

export async function createSubject(name: string, icon: string, color: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // Get max order
  const { data: maxObj } = await supabase
    .from('subjects')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: user.id,
      name,
      icon,
      color,
      display_order: maxOrder,
      estimated_hours: 0.00,
      completed_hours: 0.00,
      roadmap_days: 120,
      is_hidden: false
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/subjects')
  return data
}

export async function updateSubject(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('subjects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/subjects')
  revalidatePath(`/subjects/${id}`)
  return data
}

export async function deleteSubject(id: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/subjects')
  return { success: true }
}

export async function reorderSubjects(items: { id: string; display_order: number }[]) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  for (const item of items) {
    const { error } = await supabase
      .from('subjects')
      .update({ display_order: item.display_order })
      .eq('id', item.id)

    if (error) throw error
  }

  revalidatePath('/')
  revalidatePath('/subjects')
  return { success: true }
}

export async function duplicateSubject(id: string) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  // 1. Get original subject
  const { data: sub, error: subErr } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single()

  if (subErr || !sub) throw subErr

  // 2. Get max display_order for subjects
  const { data: maxObj } = await supabase
    .from('subjects')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  // 3. Insert duplicated subject
  const { data: newSub, error: newSubErr } = await supabase
    .from('subjects')
    .insert({
      user_id: user.id,
      name: `${sub.name} (Copy)`,
      icon: sub.icon,
      color: sub.color,
      display_order: maxOrder,
      estimated_hours: 0.00, // Trigger will recalculate
      completed_hours: 0.00,
      roadmap_days: sub.roadmap_days,
      is_hidden: sub.is_hidden
    })
    .select()
    .single()

  if (newSubErr || !newSub) throw newSubErr

  // 4. Duplicate modules of subject
  const { data: mods } = await supabase
    .from('modules')
    .select('*')
    .eq('subject_id', id)
    .order('display_order', { ascending: true })

  if (mods) {
    for (const mod of mods) {
      const { data: newMod, error: newModErr } = await supabase
        .from('modules')
        .insert({
          subject_id: newSub.id,
          name: mod.name,
          description: mod.description,
          display_order: mod.display_order,
          is_collapsed: mod.is_collapsed,
          is_important: mod.is_important,
          estimated_hours: 0.00,
          completed_hours: 0.00
        })
        .select()
        .single()

      if (newModErr || !newMod) throw newModErr

      // Duplicate lectures of this module
      const { data: lecs } = await supabase
        .from('lectures')
        .select('*')
        .eq('module_id', mod.id)
        .order('display_order', { ascending: true })

      if (lecs) {
        for (const lec of lecs) {
          const { data: newLec, error: newLecErr } = await supabase
            .from('lectures')
            .insert({
              module_id: newMod.id,
              title: lec.title,
              description: lec.description,
              estimated_hours: lec.estimated_hours,
              completed_hours: 0.00, // resets progress
              display_order: lec.display_order,
              is_marked_for_revision: false,
              importance_level: lec.importance_level
            })
            .select()
            .single()

          if (newLecErr || !newLec) throw newLecErr

          // Duplicate links of lecture
          const { data: links } = await supabase
            .from('lecture_links')
            .select('*')
            .eq('lecture_id', lec.id)

          if (links) {
            for (const link of links) {
              const { error: newLinkErr } = await supabase
                .from('lecture_links')
                .insert({
                  lecture_id: newLec.id,
                  title: link.title,
                  url: link.url,
                  display_order: link.display_order
                })
              if (newLinkErr) throw newLinkErr
            }
          }
        }
      }
    }
  }

  revalidatePath('/')
  revalidatePath('/subjects')
  return newSub
}

// ==========================================
// 2. MODULES ACTIONS
// ==========================================

export async function createModule(subjectId: string, name: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // Get max order
  const { data: maxObj } = await supabase
    .from('modules')
    .select('display_order')
    .eq('subject_id', subjectId)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  const { data, error } = await supabase
    .from('modules')
    .insert({
      subject_id: subjectId,
      name,
      display_order: maxOrder,
      is_collapsed: false,
      is_important: false,
      estimated_hours: 0.00,
      completed_hours: 0.00
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath(`/subjects/${subjectId}`)
  return data
}

export async function updateModule(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('modules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  if (data) {
    revalidatePath(`/subjects/${data.subject_id}`)
  }
  return data
}

export async function deleteModule(id: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data: mod } = await supabase
    .from('modules')
    .select('subject_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id)

  if (error) throw error
  if (mod) {
    revalidatePath(`/subjects/${mod.subject_id}`)
  }
  return { success: true }
}

export async function reorderModules(items: { id: string; display_order: number }[]) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  for (const item of items) {
    const { error } = await supabase
      .from('modules')
      .update({ display_order: item.display_order })
      .eq('id', item.id)

    if (error) throw error
  }

  return { success: true }
}

export async function moveModule(id: string, targetSubjectId: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // Get max display_order in target subject
  const { data: maxObj } = await supabase
    .from('modules')
    .select('display_order')
    .eq('subject_id', targetSubjectId)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  const { data: oldMod } = await supabase
    .from('modules')
    .select('subject_id')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('modules')
    .update({
      subject_id: targetSubjectId,
      display_order: maxOrder,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (oldMod) revalidatePath(`/subjects/${oldMod.subject_id}`)
  revalidatePath(`/subjects/${targetSubjectId}`)
  return data
}

export async function duplicateModule(id: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // 1. Get original module
  const { data: mod, error: modErr } = await supabase
    .from('modules')
    .select('*')
    .eq('id', id)
    .single()

  if (modErr || !mod) throw modErr

  // 2. Get max display_order
  const { data: maxObj } = await supabase
    .from('modules')
    .select('display_order')
    .eq('subject_id', mod.subject_id)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  // 3. Insert duplicated module
  const { data: newMod, error: newModErr } = await supabase
    .from('modules')
    .insert({
      subject_id: mod.subject_id,
      name: `${mod.name} (Copy)`,
      description: mod.description,
      display_order: maxOrder,
      is_collapsed: mod.is_collapsed,
      is_important: mod.is_important,
      estimated_hours: 0.00,
      completed_hours: 0.00
    })
    .select()
    .single()

  if (newModErr || !newMod) throw newModErr

  // 4. Duplicate lectures
  const { data: lecs } = await supabase
    .from('lectures')
    .select('*')
    .eq('module_id', id)
    .order('display_order', { ascending: true })

  if (lecs) {
    for (const lec of lecs) {
      const { data: newLec, error: newLecErr } = await supabase
        .from('lectures')
        .insert({
          module_id: newMod.id,
          title: lec.title,
          description: lec.description,
          estimated_hours: lec.estimated_hours,
          completed_hours: 0.00,
          display_order: lec.display_order,
          is_marked_for_revision: false,
          importance_level: lec.importance_level
        })
        .select()
        .single()

      if (newLecErr || !newLec) throw newLecErr

      // Duplicate links
      const { data: links } = await supabase
        .from('lecture_links')
        .select('*')
        .eq('lecture_id', lec.id)

      if (links) {
        for (const link of links) {
          const { error: linkErr } = await supabase
            .from('lecture_links')
            .insert({
              lecture_id: newLec.id,
              title: link.title,
              url: link.url,
              display_order: link.display_order
            })
          if (linkErr) throw linkErr
        }
      }
    }
  }

  revalidatePath(`/subjects/${mod.subject_id}`)
  return newMod
}

// ==========================================
// 3. LECTURES ACTIONS
// ==========================================

export async function createLecture(moduleId: string, title: string, estimatedHours: number = 1.0) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // Get max order
  const { data: maxObj } = await supabase
    .from('lectures')
    .select('display_order')
    .eq('module_id', moduleId)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  const { data: mod } = await supabase
    .from('modules')
    .select('subject_id')
    .eq('id', moduleId)
    .single()

  const { data, error } = await supabase
    .from('lectures')
    .insert({
      module_id: moduleId,
      title,
      estimated_hours: estimatedHours,
      completed_hours: 0.00,
      display_order: maxOrder,
      is_marked_for_revision: false,
      importance_level: 'NONE'
    })
    .select()
    .single()

  if (error) throw error
  if (mod) {
    revalidatePath(`/subjects/${mod.subject_id}`)
  }
  return data
}

export async function updateLecture(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data: oldLec } = await supabase
    .from('lectures')
    .select('module_id, modules(subject_id)')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('lectures')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (oldLec) {
    const subjectId = getSubjectIdFromRelation(oldLec.modules)
    if (subjectId) revalidatePath(`/subjects/${subjectId}`)
  }
  return data
}

export async function deleteLecture(id: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data: oldLec } = await supabase
    .from('lectures')
    .select('module_id, modules(subject_id)')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('lectures')
    .delete()
    .eq('id', id)

  if (error) throw error

  if (oldLec) {
    const subjectId = getSubjectIdFromRelation(oldLec.modules)
    if (subjectId) revalidatePath(`/subjects/${subjectId}`)
  }
  return { success: true }
}

export async function reorderLectures(items: { id: string; display_order: number; module_id?: string }[]) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  for (const item of items) {
    const updates: Record<string, unknown> = { display_order: item.display_order }
    if (item.module_id) {
      updates.module_id = item.module_id
    }
    const { error } = await supabase
      .from('lectures')
      .update(updates)
      .eq('id', item.id)

    if (error) throw error
  }

  return { success: true }
}

export async function moveLecture(id: string, targetModuleId: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // Get max display_order in target module
  const { data: maxObj } = await supabase
    .from('lectures')
    .select('display_order')
    .eq('module_id', targetModuleId)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  const { data: oldLec } = await supabase
    .from('lectures')
    .select('module_id, modules(subject_id)')
    .eq('id', id)
    .single()

  const { data: targetMod } = await supabase
    .from('modules')
    .select('subject_id')
    .eq('id', targetModuleId)
    .single()

  const { data, error } = await supabase
    .from('lectures')
    .update({
      module_id: targetModuleId,
      display_order: maxOrder,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (oldLec) {
    const sId = getSubjectIdFromRelation(oldLec.modules)
    if (sId) revalidatePath(`/subjects/${sId}`)
  }
  if (targetMod) revalidatePath(`/subjects/${targetMod.subject_id}`)

  return data
}

export async function duplicateLecture(id: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // 1. Get original lecture
  const { data: lec, error: lecErr } = await supabase
    .from('lectures')
    .select('*, modules(subject_id)')
    .eq('id', id)
    .single()

  if (lecErr || !lec) throw lecErr

  // 2. Get max display_order
  const { data: maxObj } = await supabase
    .from('lectures')
    .select('display_order')
    .eq('module_id', lec.module_id)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  // 3. Insert duplicated lecture
  const { data: newLec, error: newLecErr } = await supabase
    .from('lectures')
    .insert({
      module_id: lec.module_id,
      title: `${lec.title} (Copy)`,
      description: lec.description,
      estimated_hours: lec.estimated_hours,
      completed_hours: 0.00,
      display_order: maxOrder,
      is_marked_for_revision: false,
      importance_level: lec.importance_level
    })
    .select()
    .single()

  if (newLecErr || !newLec) throw newLecErr

  // 4. Duplicate links
  const { data: links } = await supabase
    .from('lecture_links')
    .select('*')
    .eq('lecture_id', id)

  if (links) {
    for (const link of links) {
      const { error: linkErr } = await supabase
        .from('lecture_links')
        .insert({
          lecture_id: newLec.id,
          title: link.title,
          url: link.url,
          display_order: link.display_order
        })
      if (linkErr) throw linkErr
    }
  }

  const sId = getSubjectIdFromRelation(lec.modules)
  if (sId) revalidatePath(`/subjects/${sId}`)

  return newLec
}

// ==========================================
// 4. LECTURE LINKS ACTIONS
// ==========================================

export async function createLink(lectureId: string, title: string, url: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // Get max order
  const { data: maxObj } = await supabase
    .from('lecture_links')
    .select('display_order')
    .eq('lecture_id', lectureId)
    .order('display_order', { ascending: false })
    .limit(1)

  const maxOrder = maxObj && maxObj[0] ? maxObj[0].display_order + 1 : 0

  const { data, error } = await supabase
    .from('lecture_links')
    .insert({
      lecture_id: lectureId,
      title,
      url,
      display_order: maxOrder
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLink(id: string, updates: Record<string, unknown>) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('lecture_links')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLink(id: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { error } = await supabase
    .from('lecture_links')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}

export interface DBSubjectDetail {
  id: string
  name: string
  icon: string
  color: string
  estimated_hours: number
  completed_hours: number
  roadmap_days: number
  is_hidden: boolean
  modules: Array<{
    id: string
    name: string
    display_order: number
    is_collapsed: boolean
    is_important: boolean
    estimated_hours: number
    completed_hours: number
    lectures: Array<{
      id: string
      title: string
      estimated_hours: number
      completed_hours: number
      display_order: number
      is_marked_for_revision: boolean
      importance_level: string
      lecture_links: Array<{
        id: string
        title: string
        url: string
        display_order: number
      }>
    }>
  }>
}

export async function getSubjectDetail(subjectId: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('subjects')
    .select(`
      *,
      modules (
        *,
        lectures (
          *,
          lecture_links (
            *
          )
        )
      )
    `)
    .eq('id', subjectId)
    .single()

  if (error) throw error

  const detail = data as unknown as DBSubjectDetail

  // Sort modules, lectures, and links by display_order
  if (detail && detail.modules) {
    detail.modules.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    detail.modules.forEach((mod) => {
      if (mod.lectures) {
        mod.lectures.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        mod.lectures.forEach((lec) => {
          if (lec.lecture_links) {
            lec.lecture_links.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          }
        })
      }
    })
  }

  return detail
}

export async function getAppStats() {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data: subjects, error: subErr } = await supabase
    .from('subjects')
    .select('estimated_hours, completed_hours')

  if (subErr) throw subErr

  const { data: lectures, error: lecErr } = await supabase
    .from('lectures')
    .select('estimated_hours, completed_hours')

  if (lecErr) throw lecErr

  const totalEstimated = subjects ? subjects.reduce((sum, s) => sum + Number(s.estimated_hours), 0) : 0
  const totalCompleted = subjects ? subjects.reduce((sum, s) => sum + Number(s.completed_hours), 0) : 0

  const totalLectures = lectures ? lectures.length : 0
  const completedLectures = lectures
    ? lectures.filter((l) => Number(l.completed_hours) >= Number(l.estimated_hours) && Number(l.estimated_hours) > 0).length
    : 0

  return {
    totalEstimated,
    totalCompleted,
    totalLectures,
    completedLectures,
  }
}

export async function getProfile() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(updates: Record<string, unknown>) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleLectureComplete(lectureId: string, isCompleted: boolean) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // 1. Fetch lecture estimated hours
  const { data: lec } = await supabase
    .from('lectures')
    .select('estimated_hours, module_id, modules(subject_id)')
    .eq('id', lectureId)
    .single()

  if (!lec) throw new Error('Lecture not found')

  const compHrs = isCompleted ? Number(lec.estimated_hours) : 0.00

  // 2. Update lecture
  const { data, error } = await supabase
    .from('lectures')
    .update({ completed_hours: compHrs, updated_at: new Date().toISOString() })
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error

  // 3. Update roadmap_items if exists
  await supabase
    .from('roadmap_items')
    .update({ completed: isCompleted })
    .eq('lecture_id', lectureId)

  const subjectId = getSubjectIdFromRelation(lec.modules)
  if (subjectId) revalidatePath(`/subjects/${subjectId}`)
  revalidatePath('/')
  revalidatePath('/roadmap')

  return data
}

export async function updateLectureCompletedHours(lectureId: string, hours: number) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // 1. Fetch lecture details
  const { data: lec } = await supabase
    .from('lectures')
    .select('module_id, modules(subject_id)')
    .eq('id', lectureId)
    .single()

  if (!lec) throw new Error('Lecture not found')

  // 2. Update lecture
  const { data, error } = await supabase
    .from('lectures')
    .update({ completed_hours: hours, updated_at: new Date().toISOString() })
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error

  const isLecCompleted = data ? (Number(data.completed_hours) >= Number(data.estimated_hours)) : false
  await supabase
    .from('roadmap_items')
    .update({ completed: isLecCompleted })
    .eq('lecture_id', lectureId)

  const subjectId = getSubjectIdFromRelation(lec.modules)
  if (subjectId) revalidatePath(`/subjects/${subjectId}`)
  revalidatePath('/')
  revalidatePath('/roadmap')

  return data
}

export async function getRevisionLectures() {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('lectures')
    .select(`
      *,
      modules (
        id,
        name,
        is_important,
        subjects (
          id,
          name,
          color
        )
      ),
      revisions (
        id,
        revision_date,
        revision_number,
        comments
      )
    `)
    .eq('is_marked_for_revision', true)

  if (error) throw error
  return data || []
}

export async function addRevisionSession(lectureId: string, comments?: string) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // 1. Get current count
  const { data: revs } = await supabase
    .from('revisions')
    .select('revision_number')
    .eq('lecture_id', lectureId)
    .order('revision_number', { ascending: false })
    .limit(1)

  const nextNum = revs && revs[0] ? revs[0].revision_number + 1 : 1

  // 2. Insert session
  const { data: session, error: insErr } = await supabase
    .from('revisions')
    .insert({
      lecture_id: lectureId,
      revision_number: nextNum,
      comments: comments || '',
      revision_date: new Date().toISOString()
    })
    .select()
    .single()

  if (insErr) throw insErr

  // 3. Keep it marked for revision, update lecture timestamps
  await supabase
    .from('lectures')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', lectureId)

  revalidatePath('/revision')
  return session
}

export async function toggleMarkForRevision(lectureId: string, marked: boolean) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('lectures')
    .update({ is_marked_for_revision: marked, updated_at: new Date().toISOString() })
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/revision')
  return data
}

export async function updateLectureImportance(lectureId: string, level: 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE') {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('lectures')
    .update({ importance_level: level, updated_at: new Date().toISOString() })
    .eq('id', lectureId)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/revision')
  return data
}

export async function toggleModuleImportance(moduleId: string, isImportant: boolean) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('modules')
    .update({ is_important: isImportant, updated_at: new Date().toISOString() })
    .eq('id', moduleId)
    .select()
    .single()

  if (error) throw error

  // Revalidate parent subjects if needed
  if (data) {
    revalidatePath(`/subjects/${data.subject_id}`)
  }
  revalidatePath('/revision')
  return data
}

export async function getPriorityTopics() {
  const supabase = await createClient()
  await getAuthUser(supabase)

  // 1. Fetch modules marked important
  const { data: modules, error: modErr } = await supabase
    .from('modules')
    .select(`
      *,
      subjects (
        id,
        name,
        color
      )
    `)
    .eq('is_important', true)

  if (modErr) throw modErr

  // 2. Fetch lectures with high/medium importance level
  const { data: lectures, error: lecErr } = await supabase
    .from('lectures')
    .select(`
      *,
      modules (
        id,
        name,
        subjects (
          id,
          name,
          color
        )
      )
    `)
    .in('importance_level', ['HIGH', 'MEDIUM'])

  if (lecErr) throw lecErr

  return {
    modules: modules || [],
    lectures: lectures || [],
  }
}

export async function exportUserData() {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const { data: subjects } = await supabase.from('subjects').select('*')
  const { data: modules } = await supabase.from('modules').select('*')
  const { data: lectures } = await supabase.from('lectures').select('*')
  const { data: links } = await supabase.from('lecture_links').select('*')
  const { data: revisions } = await supabase.from('revisions').select('*')
  const { data: roadmap } = await supabase.from('roadmap').select('*')
  const { data: roadmapItems } = await supabase.from('roadmap_items').select('*')

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    subjects: subjects || [],
    modules: modules || [],
    lectures: lectures || [],
    lecture_links: links || [],
    revisions: revisions || [],
    roadmap: roadmap || [],
    roadmap_items: roadmapItems || [],
  }

  await logActivity(supabase, 'DATA_EXPORT', 'Exported entire study planner workspace data')

  return exportData
}

export async function importUserData(importData: unknown) {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const rawData = importData as Record<string, unknown>
  if (!rawData || typeof rawData !== 'object') throw new Error('Invalid JSON format')
  if (rawData.version !== '1.0') throw new Error('Unsupported export version')
  if (!Array.isArray(rawData.subjects) || !Array.isArray(rawData.modules) || !Array.isArray(rawData.lectures)) {
    throw new Error('Missing core syllabus tables in import data')
  }

  // Wipe existing data
  const { error: delSubErr } = await supabase.from('subjects').delete().eq('user_id', user.id)
  if (delSubErr) throw delSubErr

  const { error: delRoadErr } = await supabase.from('roadmap').delete().eq('user_id', user.id)
  if (delRoadErr) throw delRoadErr

  // Insert records chronologically
  if (rawData.roadmap && Array.isArray(rawData.roadmap) && rawData.roadmap.length > 0) {
    const roadmapToIns = rawData.roadmap.map((r) => ({ ...r, user_id: user.id }))
    const { error: rErr } = await supabase.from('roadmap').insert(roadmapToIns)
    if (rErr) throw rErr
  }

  if (rawData.subjects && Array.isArray(rawData.subjects) && rawData.subjects.length > 0) {
    const subsToIns = rawData.subjects.map((s) => ({ ...s, user_id: user.id }))
    const { error: sErr } = await supabase.from('subjects').insert(subsToIns)
    if (sErr) throw sErr
  }

  if (rawData.modules && Array.isArray(rawData.modules) && rawData.modules.length > 0) {
    const { error: mErr } = await supabase.from('modules').insert(rawData.modules)
    if (mErr) throw mErr
  }

  if (rawData.lectures && Array.isArray(rawData.lectures) && rawData.lectures.length > 0) {
    const { error: lErr } = await supabase.from('lectures').insert(rawData.lectures)
    if (lErr) throw lErr
  }

  if (rawData.lecture_links && Array.isArray(rawData.lecture_links) && rawData.lecture_links.length > 0) {
    const { error: lnErr } = await supabase.from('lecture_links').insert(rawData.lecture_links)
    if (lnErr) throw lnErr
  }

  if (rawData.revisions && Array.isArray(rawData.revisions) && rawData.revisions.length > 0) {
    const { error: revErr } = await supabase.from('revisions').insert(rawData.revisions)
    if (revErr) throw revErr
  }

  if (rawData.roadmap_items && Array.isArray(rawData.roadmap_items) && rawData.roadmap_items.length > 0) {
    const { error: riErr } = await supabase.from('roadmap_items').insert(rawData.roadmap_items)
    if (riErr) throw riErr
  }

  await logActivity(
    supabase,
    'DATA_IMPORT',
    `Imported study planner data (${rawData.subjects.length} subjects, ${rawData.lectures.length} lectures)`
  )

  revalidatePath('/')
  revalidatePath('/subjects')
  revalidatePath('/roadmap')
  revalidatePath('/revision')

  return { success: true }
}

export async function wipeUserData() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { error: subErr } = await supabase.from('subjects').delete().eq('user_id', user.id)
  if (subErr) throw subErr

  const { error: roadErr } = await supabase.from('roadmap').delete().eq('user_id', user.id)
  if (roadErr) throw roadErr

  await logActivity(supabase, 'DATA_WIPE', 'Wiped all user subjects, schedule, and revision data')

  revalidatePath('/')
  revalidatePath('/subjects')
  revalidatePath('/roadmap')
  revalidatePath('/revision')

  return { success: true }
}

export async function getActivityLogs() {
  const supabase = await createClient()
  const user = await getAuthUser(supabase)

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  return data || []
}

export async function batchToggleLectures(updates: Array<{ id: string; isCompleted: boolean }>) {
  const supabase = await createClient()
  await getAuthUser(supabase)

  const results = await Promise.all(
    updates.map(async (u) => {
      const { data: lec } = await supabase
        .from('lectures')
        .select('estimated_hours, module_id, modules(subject_id)')
        .eq('id', u.id)
        .single()

      if (!lec) return null

      const compHrs = u.isCompleted ? Number(lec.estimated_hours) : 0.00

      const { data: updatedLec, error } = await supabase
        .from('lectures')
        .update({ completed_hours: compHrs, updated_at: new Date().toISOString() })
        .eq('id', u.id)
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('roadmap_items')
        .update({ completed: u.isCompleted })
        .eq('lecture_id', u.id)

      return {
        updatedLec,
        subjectId: getSubjectIdFromRelation(lec.modules)
      }
    })
  )

  const subjectIds = Array.from(new Set(results.map((r) => r?.subjectId).filter(Boolean)))
  subjectIds.forEach((id) => revalidatePath(`/subjects/${id}`))
  revalidatePath('/')
  revalidatePath('/roadmap')

  return { success: true }
}

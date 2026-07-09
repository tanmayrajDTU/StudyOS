'use server'

import { createClient } from '@/utils/supabase/server'
import { SEED_SUBJECTS } from '@/lib/seed-data'

export async function checkAndSeedUser() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  // 2. Validate email is authorized
  if (user.email !== 'tanmayraj1705@gmail.com') {
    throw new Error('Unauthorized account')
  }

  // Check if profile exists (handles table reset condition)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    console.log('Profile missing. Creating profile record for:', user.id)
    const { error: insertProfileErr } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Authorized User',
        avatar_url: user.user_metadata?.avatar_url || '',
        daily_target_hours: 8.00
      })

    if (insertProfileErr) throw insertProfileErr
  }

  try {
    // 3. Check if user already has subjects
    const { data: existingSubjects, error: checkError } = await supabase
      .from('subjects')
      .select('id')
      .limit(1)

    if (checkError) throw checkError

    if (existingSubjects && existingSubjects.length > 0) {
      // Already seeded
      return { seeded: false, message: 'Subjects already initialized.' }
    }

    console.log('Seeding initial subjects and syllabus for user:', user.id)

    // 4. Seeding loop
    for (let sIdx = 0; sIdx < SEED_SUBJECTS.length; sIdx++) {
      const sub = SEED_SUBJECTS[sIdx]

      // Insert subject
      const { data: newSub, error: subError } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: sub.name,
          icon: sub.icon,
          color: sub.color,
          display_order: sIdx,
          estimated_hours: 0.00,
          completed_hours: 0.00,
          roadmap_days: 120,
          is_hidden: false
        })
        .select('id')
        .single()

      if (subError || !newSub) throw subError

      // Insert modules of this subject
      for (let mIdx = 0; mIdx < sub.modules.length; mIdx++) {
        const mod = sub.modules[mIdx]

        const { data: newMod, error: modError } = await supabase
          .from('modules')
          .insert({
            subject_id: newSub.id,
            name: mod.name,
            display_order: mIdx,
            is_collapsed: false,
            is_important: mod.isImportant || false,
            estimated_hours: 0.00,
            completed_hours: 0.00
          })
          .select('id')
          .single()

        if (modError || !newMod) throw modError

        // Insert lectures of this module
        for (let lIdx = 0; lIdx < mod.lectures.length; lIdx++) {
          const lec = mod.lectures[lIdx]

          const { error: lecError } = await supabase
            .from('lectures')
            .insert({
              module_id: newMod.id,
              title: lec.title,
              estimated_hours: lec.estimatedHours,
              completed_hours: 0.00,
              display_order: lIdx,
              is_marked_for_revision: false,
              importance_level: 'NONE'
            })

          if (lecError) throw lecError
        }
      }
    }

    console.log('Seeding completed successfully!')
    return { seeded: true, message: 'All subjects and lectures initialized successfully.' }
  } catch (err: unknown) {
    const errorObj = err as { message?: string; details?: string; hint?: string; code?: string } | null
    if (errorObj?.code === '23505') {
      console.log('Parallel seeding detected. Subjects already initialized.')
      return { seeded: false, message: 'Subjects already initialized by parallel thread.' }
    }
    const message = errorObj?.message || 'Seeding failed.'
    console.error('Seeding transaction failed:', message, errorObj?.details || '', errorObj?.hint || '')
    throw new Error(`${message}${errorObj?.details ? ': ' + errorObj.details : ''}`)
  }
}

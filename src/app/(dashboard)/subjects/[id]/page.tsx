import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SubjectDetailClient from './SubjectDetailClient'
import { checkPyqSubjectExists } from '@/actions/pyq'

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch subject metadata to confirm it exists and belongs to the user
  const { data: subject, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !subject) {
    redirect('/subjects')
  }

  const hasPyqs = await checkPyqSubjectExists(subject.name)

  return (
    <SubjectDetailClient 
      subjectId={id} 
      initialSubject={subject} 
      hasPyqs={hasPyqs} 
    />
  )
}

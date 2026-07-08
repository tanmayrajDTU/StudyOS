import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { checkAndSeedUser } from '@/actions/seed'
import SidebarWrapper from './SidebarWrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Authorize email
  if (user.email !== 'tanmayraj1705@gmail.com') {
    redirect('/unauthorized')
  }

  // 3. Get profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 4. Trigger auto-seeding on first run
  try {
    await checkAndSeedUser()
  } catch (err) {
    console.error('Auto-seeding failed in layout:', err)
  }

  return (
    <SidebarWrapper initialProfile={profile}>
      {children}
    </SidebarWrapper>
  )
}

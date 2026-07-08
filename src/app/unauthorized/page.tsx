'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'

export default function UnauthorizedPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.refresh()
      router.push('/login')
    } catch (err) {
      console.error('Logout failed:', err)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground px-2">
          This Google account is not authorized to access StudyOS.
        </p>

        <div className="pt-2">
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full rounded-xl border border-border bg-secondary hover:bg-accent hover:text-accent-foreground text-foreground font-medium h-12 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Signing out...' : 'Sign Out & Try Again'}
          </button>
        </div>
      </div>
    </main>
  )
}

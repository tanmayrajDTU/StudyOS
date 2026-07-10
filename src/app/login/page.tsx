'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.')
      setLoading(false)
      return
    }

    if (email.trim() !== 'tanmayraj1705@gmail.com') {
      setErrorMsg('Access is strictly restricted to tanmayraj1705@gmail.com.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      if (isSignUp) {
        // Sign Up Mode
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: 'Tanmay Raj',
            },
          },
        })
        if (error) throw error
        setSuccessMsg(
          'Registration request submitted! Please check your email to confirm (or sign in directly if email confirmation is disabled in your Supabase Console).'
        )
      } else {
        // Sign In Mode
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error
        
        router.refresh()
        router.push('/')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent relative z-1 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">StudyOS</h1>
          <p className="text-xs text-muted-foreground">
            A premium operating system for your learning journeys.
          </p>
        </div>

        {/* Success / Error Banners */}
        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 p-3 text-2xs text-destructive border border-destructive/20 text-center animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-emerald-500/10 p-3 text-2xs text-emerald-500 border border-emerald-500/20 text-center animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-4xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="tanmayraj1705@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono placeholder:text-muted-foreground/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-4xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono placeholder:text-muted-foreground/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-bold h-11 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer text-xs"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Developer Account' : 'Sign In'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggle Switch */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg('')
              setSuccessMsg('')
            }}
            disabled={loading}
            className="text-3xs font-semibold text-primary hover:underline cursor-pointer"
          >
            {isSignUp ? 'Already registered? Sign In instead' : 'New local setup? Sign Up instead'}
          </button>
        </div>
      </div>
    </main>
  )
}

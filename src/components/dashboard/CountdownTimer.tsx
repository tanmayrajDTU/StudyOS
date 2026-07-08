'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Timer } from 'lucide-react'

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isOver: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false })

  useEffect(() => {
    // GATE 2027 Exam Date: Feb 6, 2027, 09:00:00 AM IST
    const targetDate = new Date('2027-02-06T09:00:00+05:30').getTime()

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isOver: false })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  if (timeLeft.isOver) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3 text-foreground">
        <Calendar className="h-5 w-5 text-primary" />
        <span className="text-xs font-bold font-mono">GATE CSE 2027 Exam Day has arrived! Best of Luck! 🚀</span>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Decorative backdrop glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3.5 z-10">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 animate-pulse">
          <Timer className="h-5.5 w-5.5" />
        </div>
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
            GATE CSE 2027 COUNTDOWN
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Target Exam Date: <span className="font-semibold text-foreground font-mono">Saturday, Feb 6, 2027</span>
          </p>
        </div>
      </div>

      {/* Countdown Digits */}
      <div className="flex items-center gap-3.5 z-10 font-mono">
        <div className="flex flex-col items-center">
          <div className="bg-card border border-border/80 rounded-xl px-3.5 py-2 min-w-[54px] text-center shadow-sm">
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              {String(timeLeft.days).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Days</span>
        </div>

        <span className="text-lg font-bold text-muted-foreground/60 -mt-5">:</span>

        <div className="flex flex-col items-center">
          <div className="bg-card border border-border/80 rounded-xl px-3 py-2 min-w-[48px] text-center shadow-sm">
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Hrs</span>
        </div>

        <span className="text-lg font-bold text-muted-foreground/60 -mt-5">:</span>

        <div className="flex flex-col items-center">
          <div className="bg-card border border-border/80 rounded-xl px-3 py-2 min-w-[48px] text-center shadow-sm">
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Mins</span>
        </div>

        <span className="text-lg font-bold text-muted-foreground/60 -mt-5">:</span>

        <div className="flex flex-col items-center">
          <div className="bg-card border border-border/80 rounded-xl px-3 py-2 min-w-[48px] text-center shadow-sm">
            <span className="text-lg font-extrabold text-primary tracking-tight">
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Secs</span>
        </div>
      </div>
    </div>
  )
}

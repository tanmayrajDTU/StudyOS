'use client'

import { useEffect, useState, useMemo } from "react"
import { Particles, ParticlesProvider } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"
import { loadRoundedRectShape } from "@tsparticles/shape-rounded-rect"
import type { Engine, Container } from "@tsparticles/engine"
import { useTheme } from "@/components/common/ThemeProvider"
import { getParticleConfig } from "@/config/particleConfig"

// Initializer callback for the tsParticles engine
const particlesInit = async (engine: Engine): Promise<void> => {
  console.log("tsParticles: initializing engine slim bundle...")
  await loadSlim(engine)
  console.log("tsParticles: loading rounded rect shape drawer...")
  await loadRoundedRectShape(engine)
  console.log("tsParticles: engine initialized successfully!")
}

export default function InteractiveParticles() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    // Setup media query listener for reduced motion preferences
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      setPrefersReducedMotion(mediaQuery.matches)

      const listener = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches)
      }

      mediaQuery.addEventListener("change", listener)
      return () => {
        mediaQuery.removeEventListener("change", listener)
      }
    }
  }, [])

  const isLightMode = theme === "light"

  // Memoize configuration to prevent canvas rebuilding or unnecessary rendering cycles
  const options = useMemo(() => {
    return getParticleConfig(isLightMode, prefersReducedMotion)
  }, [isLightMode, prefersReducedMotion])

  const handleParticlesLoaded = async (container?: Container): Promise<void> => {
    console.log("tsParticles: canvas container successfully loaded into DOM:", container)
  }

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles
        id="tsparticles"
        options={options}
        particlesLoaded={handleParticlesLoaded}
        style={{ pointerEvents: "none" }}
      />
    </ParticlesProvider>
  )
}

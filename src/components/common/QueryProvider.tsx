'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // Default staleTime is 5 minutes
          refetchOnWindowFocus: false,
        },
      },
    })

    // 1. Static Question details (never changes, pure JSON dataset)
    client.setQueryDefaults(['pyq-question-detail'], {
      staleTime: 60 * 60 * 1000, // 1 hour stale time
      gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection
    })

    // 2. Static PYQ Subjects & Topics structure directory listings
    client.setQueryDefaults(['pyq-subjects'], {
      staleTime: 30 * 60 * 1000, // 30 minutes
    })
    client.setQueryDefaults(['pyq-subject'], {
      staleTime: 15 * 60 * 1000, // 15 minutes
    })
    client.setQueryDefaults(['pyq-topic'], {
      staleTime: 15 * 60 * 1000, // 15 minutes
    })

    // 3. User profile and Course Subjects listings (semi-static)
    client.setQueryDefaults(['profile'], {
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
    client.setQueryDefaults(['subjects'], {
      staleTime: 10 * 60 * 1000, // 10 minutes
    })
    client.setQueryDefaults(['subject-detail'], {
      staleTime: 10 * 60 * 1000, // 10 minutes
    })

    // 4. Priority topics & revisions list
    client.setQueryDefaults(['priority-topics'], {
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
    client.setQueryDefaults(['revisions'], {
      staleTime: 3 * 60 * 1000, // 3 minutes
    })

    // 5. Dynamic Schedules & Stats (changes frequently)
    client.setQueryDefaults(['app-stats'], {
      staleTime: 2 * 60 * 1000, // 2 minutes
    })
    client.setQueryDefaults(['roadmap'], {
      staleTime: 2 * 60 * 1000, // 2 minutes
    })
    client.setQueryDefaults(['today-roadmap'], {
      staleTime: 1 * 60 * 1000, // 1 minute
    })

    return client
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}


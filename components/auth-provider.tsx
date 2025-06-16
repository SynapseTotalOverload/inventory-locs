"use client"

import type React from "react"
import { createClient } from "@/utils/supabase/client"
import { useAuthStore } from "@/store/auth-store"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>

    try {
      supabase = createClient()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize Supabase client")
      setLoading(false)
      return
    }

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get user")
        setLoading(false)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <br />
            Please set up your Supabase environment variables in <code>.env.local</code>:
            <br />
            <code>NEXT_PUBLIC_SUPABASE_URL=your-project-url</code>
            <br />
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</code>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}

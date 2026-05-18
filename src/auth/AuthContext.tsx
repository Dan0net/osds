import { createContext, useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [walkerProfile, setWalkerProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Dedupe re-fetches for the same user — onAuthStateChange fires on every
  // token refresh and tab focus, not just sign-in/out. StrictMode also
  // double-mounts effects in dev.
  const loadedUserIdRef = useRef(null)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data)
  }

  async function fetchWalkerProfile(userId) {
    const { data } = await supabase
      .from('walker_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setWalkerProfile(data)
  }

  async function loadUserData(session) {
    if (session?.user) {
      const sameUser = loadedUserIdRef.current === session.user.id
      setUser(session.user)
      if (!sameUser) {
        loadedUserIdRef.current = session.user.id
        await Promise.all([
          fetchProfile(session.user.id),
          fetchWalkerProfile(session.user.id),
        ])
      }
    } else {
      loadedUserIdRef.current = null
      setUser(null)
      setProfile(null)
      setWalkerProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // `onAuthStateChange` fires immediately with INITIAL_SESSION carrying the
    // current session, so we don't need a separate `getSession()` round-trip.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUserData(session)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, name: string, postcode: string, role: string, bookingIntentWalker?: string) {
    const metadata: Record<string, unknown> = { name, postcode, role }
    if (bookingIntentWalker) metadata.booking_intent_walker = bookingIntentWalker
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/account`,
      },
    })
    if (error) throw error
    return data
  }

  async function resendVerification(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    })
    if (error) throw error
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async function refreshProfile() {
    if (!user) return
    // Bypass the dedupe — caller explicitly wants a refresh.
    await Promise.all([
      fetchProfile(user.id),
      fetchWalkerProfile(user.id),
    ])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        walkerProfile,
        loading,
        signUp,
        signIn,
        signOut,
        resendVerification,
        requestPasswordReset,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

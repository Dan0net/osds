import { createContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [walkerProfile, setWalkerProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
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
      setUser(session.user)
      await Promise.all([
        fetchProfile(session.user.id),
        fetchWalkerProfile(session.user.id),
      ])
    } else {
      setUser(null)
      setProfile(null)
      setWalkerProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUserData(session)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, name, postcode, role, bookingIntentWalker) {
    const metadata = { name, postcode, role }
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
    if (user) {
      await Promise.all([
        fetchProfile(user.id),
        fetchWalkerProfile(user.id),
      ])
    }
  }

  async function completeSetup(role) {
    if (role === 'walker' && walkerProfile) {
      await supabase
        .from('walker_profiles')
        .update({ setup_completed_at: new Date().toISOString() })
        .eq('id', walkerProfile.id)
    } else if (user) {
      await supabase
        .from('users')
        .update({ setup_completed_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    // Send welcome email (fire-and-forget)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch('/.netlify/functions/send-welcome-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
      }
    } catch { /* non-critical */ }
    await refreshProfile()
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
        completeSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

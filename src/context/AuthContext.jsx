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

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    return data
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

  async function refreshProfile() {
    if (user) {
      await Promise.all([
        fetchProfile(user.id),
        fetchWalkerProfile(user.id),
      ])
    }
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
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

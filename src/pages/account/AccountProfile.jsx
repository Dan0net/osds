import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

export default function AccountProfile() {
  const { user, profile, walkerProfile, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
    business_name: '',
    bio: '',
    theme_color: '#4f46e5',
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [creatingWalker, setCreatingWalker] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
      }))
    }
    if (walkerProfile) {
      setForm((prev) => ({
        ...prev,
        business_name: walkerProfile.business_name || '',
        bio: walkerProfile.bio || '',
        theme_color: walkerProfile.theme_color || '#4f46e5',
      }))
    }
  }, [profile, walkerProfile])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const { error: userErr } = await supabase
        .from('users')
        .update({
          name: form.name,
          phone: form.phone,
          avatar_url: form.avatar_url,
        })
        .eq('id', user.id)
      if (userErr) throw userErr

      if (walkerProfile) {
        const { error: wpErr } = await supabase
          .from('walker_profiles')
          .update({
            business_name: form.business_name,
            bio: form.bio,
            theme_color: form.theme_color,
          })
          .eq('user_id', user.id)
        if (wpErr) throw wpErr
      }

      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBecomeWalker() {
    setCreatingWalker(true)
    setError(null)
    try {
      const slug = (form.name || 'walker')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const { error: wpErr } = await supabase
        .from('walker_profiles')
        .insert({
          user_id: user.id,
          slug,
          business_name: form.name + "'s Dog Walking",
        })
      if (wpErr) throw wpErr
      await refreshProfile()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingWalker(false)
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Personal info</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold overflow-hidden shrink-0">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                form.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
              <input
                type="url"
                value={form.avatar_url}
                onChange={(e) => update('avatar_url', e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Walker profile (conditional) */}
        {walkerProfile ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h2 className="font-semibold">Walker profile</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
              <input
                type="text"
                value={form.business_name}
                onChange={(e) => update('business_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.theme_color}
                  onChange={(e) => update('theme_color', e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-500">{form.theme_color}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stripe</label>
              <button
                type="button"
                className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Connect Stripe Account
              </button>
              <p className="text-xs text-gray-400 mt-1">Required to accept payments.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-semibold mb-2">Become a Walker</h2>
            <p className="text-sm text-gray-500 mb-3">Create a walker profile to offer services and accept bookings.</p>
            <button
              type="button"
              onClick={handleBecomeWalker}
              disabled={creatingWalker}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingWalker ? 'Creating…' : 'Create Walker Profile'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span className="text-green-600 text-sm">Saved!</span>}
        </div>
      </form>
    </div>
  )
}

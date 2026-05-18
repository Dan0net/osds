import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import {
  useUpdateUserProfile, useUpdateWalkerProfile, useCreateWalkerProfile,
} from '@/queries/profile'
import ImageUpload from '@/shared/ImageUpload'

export default function AccountProfile() {
  const { user, profile, walkerProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
    business_name: '',
    slug: '',
    bio: '',
    postcode: '',
    theme_color: '#4f46e5',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [searchParams] = useSearchParams()

  const updateUser = useUpdateUserProfile(user?.id)
  const updateWalker = useUpdateWalkerProfile(walkerProfile?.id)
  const createWalker = useCreateWalkerProfile()
  const saving = updateUser.isPending || updateWalker.isPending
  const creatingWalker = createWalker.isPending

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
        slug: walkerProfile.slug || '',
        bio: walkerProfile.bio || '',
        postcode: walkerProfile.postcode || '',
        theme_color: walkerProfile.theme_color || '#4f46e5',
      }))
    }
  }, [profile, walkerProfile])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      await updateUser.mutateAsync({
        name: form.name,
        phone: form.phone,
        avatar_url: form.avatar_url,
      })

      if (walkerProfile) {
        const wpUpdate = {
          business_name: form.business_name,
          slug: form.slug,
          bio: form.bio,
          postcode: form.postcode || null,
          theme_color: form.theme_color,
        }
        if (form.postcode && form.postcode !== walkerProfile.postcode) {
          try {
            const geoRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(form.postcode.trim())}`)
            const geoData = await geoRes.json()
            if (geoData.status === 200 && geoData.result) {
              wpUpdate.lat = geoData.result.latitude
              wpUpdate.lng = geoData.result.longitude
            }
          } catch { /* geocoding failed — save postcode without coordinates */ }
        } else if (!form.postcode) {
          wpUpdate.lat = null
          wpUpdate.lng = null
        }
        await updateWalker.mutateAsync(wpUpdate)
      }

      await refreshProfile?.()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleBecomeWalker() {
    if (!form.name.trim()) {
      setError('Please enter your name first')
      return
    }
    setError(null)
    try {
      const slug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      await createWalker.mutateAsync({
        user_id: user.id,
        slug,
        business_name: form.name + "'s Dog Walking",
        calendar_feed_token: crypto.randomUUID(),
      })
      await refreshProfile?.()
      navigate('/account')
    } catch (err) {
      setError(err.message)
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  return (
    <div>
      <h1 className="text-2xl mb-6">Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="">Personal info</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <ImageUpload
              bucket="avatars"
              currentUrl={form.avatar_url}
              onUpload={(url) => update('avatar_url', url)}
              aspect="circle"
            />
            <p className="text-xs text-gray-400">Click or drag to upload a profile photo</p>
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
            <h2 className="">Walker profile</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Page URL (slug)</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400 shrink-0">/w/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="your-slug"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{form.slug}.{import.meta.env.VITE_DOMAIN || 'onestopdog.shop'}</p>
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
              <input
                type="text"
                value={form.postcode}
                onChange={(e) => update('postcode', e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="SW1A 1AA"
              />
              <p className="text-xs text-gray-400 mt-1">Used so clients can find walkers near them.</p>
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
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="mb-2">Become a Walker</h2>
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

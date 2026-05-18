import { useRef, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/auth/useAuth'

export default function ImageUpload({ bucket, currentUrl, onUpload, aspect = 'square', label }: any) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)

  async function upload(file) {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onUpload(data.publicUrl)
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    upload(e.dataTransfer.files[0])
  }

  const isCircle = aspect === 'circle'

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed transition overflow-hidden flex items-center justify-center ${
          dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        } ${isCircle ? 'w-28 h-28 rounded-full' : 'w-full h-36 rounded-lg'}`}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center px-2">
            {uploading ? (
              <svg className="w-6 h-6 mx-auto text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
              </svg>
            ) : (
              <>
                <svg className="w-6 h-6 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-xs text-gray-500">{isCircle ? 'Upload photo' : 'Drop image here or click to upload'}</p>
              </>
            )}
          </div>
        )}
        {currentUrl && uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
            </svg>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files[0])}
        />
      </div>
      {currentUrl && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpload('') }}
          className="text-xs text-gray-400 hover:text-red-500 mt-1"
        >
          Remove
        </button>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

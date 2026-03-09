'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

export default function UploadPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth check — redirect to login if not signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      else setUserId(data.user.id)
    })
  }, [router])

  // Auto-capture location on mount
  useEffect(() => {
    if (!navigator.geolocation) { setLocationError(true); return }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError(true),
      { timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  function handleFile(f: File) {
    if (!f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handlePost() {
    if (!file || !location || !userId) return
    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('bench-images')
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('bench_posts')
      .insert({ user_id: userId, latitude: location.lat, longitude: location.lng, image_path: path })

    if (insertError) {
      setError('Could not save post. Please try again.')
      setUploading(false)
      return
    }

    router.push('/')
  }

  const canPost = !!file && !!location && !uploading

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '50%',
              background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
              color: '#111', textDecoration: 'none', marginRight: 12,
            }}
            aria-label="Back to map"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Add a bench</h1>
        </div>

        {/* Photo picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            width: '100%',
            aspectRatio: '4/3',
            borderRadius: 16,
            overflow: 'hidden',
            cursor: 'pointer',
            border: dragging ? '2px dashed #007AFF' : '2px dashed #d1d5db',
            background: dragging ? '#eff6ff' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'border-color 0.15s, background 0.15s',
            marginBottom: 16,
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Selected bench"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#374151' }}>Tap to add photo</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>or drag and drop</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Location status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10,
          background: locationError ? '#fef2f2' : location ? '#f0fdf4' : '#f9fafb',
          border: `1px solid ${locationError ? '#fecaca' : location ? '#bbf7d0' : '#e5e7eb'}`,
          marginBottom: 20,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={locationError ? '#ef4444' : location ? '#22c55e' : '#9ca3af'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: 13, color: locationError ? '#dc2626' : location ? '#16a34a' : '#6b7280' }}>
            {locationError
              ? 'Could not get location — allow location access and retry'
              : location
                ? `Location tagged (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
                : 'Getting your location…'}
          </span>
        </div>

        {/* Error */}
        {error && (
          <p role="alert" style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={!canPost}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 12,
            border: 'none',
            background: canPost ? '#111' : '#e5e7eb',
            color: canPost ? '#fff' : '#9ca3af',
            fontSize: 16,
            fontWeight: 600,
            cursor: canPost ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {uploading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Posting…
            </>
          ) : 'Post bench'}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

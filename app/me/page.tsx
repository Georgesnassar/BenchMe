'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

interface BenchPost {
  id: string
  image_path: string
  created_at: string
  latitude: number
  longitude: number
}

export default function MyUploadsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BenchPost[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      setEmail(user.email ?? null)

      const { data } = await supabase
        .from('bench_posts')
        .select('id, image_path, created_at, latitude, longitude')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const p = (data ?? []) as BenchPost[]
      const urls: Record<string, string> = {}
      for (const post of p) {
        const { data: urlData } = supabase.storage.from('bench-images').getPublicUrl(post.image_path)
        urls[post.id] = urlData.publicUrl
      }

      setPosts(p)
      setImageUrls(urls)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleDeleteTap(id: string) {
    if (pendingDelete === id) {
      // Second tap — actually delete
      confirmDelete(id)
    } else {
      // First tap — arm the button
      setPendingDelete(id)
      // Auto-disarm after 3 seconds
      setTimeout(() => setPendingDelete(p => p === id ? null : p), 3000)
    }
  }

  async function confirmDelete(id: string) {
    const post = posts.find(p => p.id === id)
    if (!post) return
    setDeleting(id)
    setPendingDelete(null)

    // Delete storage file first, then DB row
    await supabase.storage.from('bench-images').remove([post.image_path])
    await supabase.from('bench_posts').delete().eq('id', id)

    // Optimistically remove from local state
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(249,250,251,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <Link
          href="/"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%',
            background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
            color: '#111', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back to map"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>My benches</p>
          {email && (
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
          )}
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          Log out
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: '#e5e7eb' }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600, color: '#374151' }}>No benches yet</p>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#9ca3af' }}>Start exploring and add your first bench.</p>
            <Link
              href="/upload"
              style={{
                display: 'inline-block', padding: '12px 24px',
                background: '#111', color: '#fff', borderRadius: 10,
                textDecoration: 'none', fontSize: 15, fontWeight: 600,
              }}
            >
              Add a bench
            </Link>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
              {posts.length} bench{posts.length !== 1 ? 'es' : ''} · tap photo to delete
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
              {posts.map(post => {
                const isArmed = pendingDelete === post.id
                const isDeleting = deleting === post.id
                return (
                  <div
                    key={post.id}
                    style={{
                      aspectRatio: '1', borderRadius: 4, overflow: 'hidden',
                      background: '#e5e7eb', position: 'relative',
                      opacity: isDeleting ? 0.4 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrls[post.id]}
                      alt="Bench"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />

                    {/* Delete overlay */}
                    <button
                      onClick={() => handleDeleteTap(post.id)}
                      disabled={!!deleting}
                      aria-label={isArmed ? 'Confirm delete' : 'Delete bench'}
                      style={{
                        position: 'absolute', inset: 0,
                        background: isArmed ? 'rgba(220,38,38,0.72)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                    >
                      {isArmed && (
                        <span style={{
                          color: '#fff', fontSize: 13, fontWeight: 700,
                          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Delete?
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

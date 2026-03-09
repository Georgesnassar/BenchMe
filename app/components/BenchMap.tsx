'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BenchPost {
  id: string
  latitude: number
  longitude: number
  image_path: string
  created_at: string
  user_id: string
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Haversine formula — returns distance in metres between two lat/lng points. */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3
  const toRad = (d: number) => (d * Math.PI) / 180
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Converts an ISO timestamp to a human-readable "X ago" string. */
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const table: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [label, secs] of table) {
    const n = Math.floor(seconds / secs)
    if (n >= 1) return `${n} ${label}${n > 1 ? 's' : ''} ago`
  }
  return 'Just now'
}

/** Creates a circular Leaflet DivIcon displaying the bench thumbnail. */
function createBenchIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:52px;height:52px;border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 2px 10px rgba(0,0,0,0.35);
      background-image:url('${imageUrl}');
      background-size:cover;background-position:center;
    "></div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -30],
  })
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006] // NYC fallback
const STREET_ZOOM = 14

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Creates the pulsing blue dot icon used to mark the user's location. */
function createUserDotIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="user-location-dot" style="
      width:18px;height:18px;border-radius:50%;
      background:#007AFF;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,122,255,0.5);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

/** Renders a pulsing blue dot at the user's current location. */
function UserDot({ position }: { position: [number, number] }) {
  return <Marker position={position} icon={createUserDotIcon()} zIndexOffset={1000} />
}

/** Captures the Leaflet map instance into a ref so we can call imperative APIs. */
function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

/**
 * Renders a single circular photo pin on the map.
 * Opens a Leaflet popup showing the full image, post timestamp,
 * and a count of other benches within 500 m.
 */
function BenchMarker({
  bench,
  allBenches,
  imageUrl,
}: {
  bench: BenchPost
  allBenches: BenchPost[]
  imageUrl: string
}) {
  // Count other benches within 500 m radius
  const nearbyCount = allBenches.filter(
    b =>
      b.id !== bench.id &&
      haversineDistance(bench.latitude, bench.longitude, b.latitude, b.longitude) <= 500,
  ).length

  return (
    <Marker position={[bench.latitude, bench.longitude]} icon={createBenchIcon(imageUrl)}>
      <Popup minWidth={220} maxWidth={260}>
        {/* Full bench photo — next/image cannot be used inside Leaflet's popup portal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Bench photo"
          style={{
            width: '100%',
            height: 150,
            objectFit: 'cover',
            borderRadius: 6,
            display: 'block',
            marginBottom: 8,
          }}
        />
        {/* Relative timestamp */}
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
          {timeAgo(bench.created_at)}
        </p>
        {/* Nearby bench counter — only shown when neighbours exist */}
        {nearbyCount > 0 && (
          <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#374151' }}>
            {nearbyCount} nearby bench{nearbyCount > 1 ? 'es' : ''}
          </p>
        )}
      </Popup>
    </Marker>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Full-screen interactive bench map.
 * Opens centered on the user's current location at street level (like Apple Maps).
 * Fetches bench_posts from Supabase and renders each as a circular photo pin.
 */
export default function BenchMap() {
  const [benches, setBenches] = useState<BenchPost[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  // Get user's location before rendering the map
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationReady(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setLocationReady(true)
      },
      () => setLocationReady(true), // permission denied or unavailable — use fallback
      { timeout: 6000, maximumAge: 60000 },
    )
  }, [])

  // Fetch bench posts from Supabase and resolve their public image URLs
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('bench_posts')
        .select('id, latitude, longitude, image_path, created_at, user_id')

      if (error) {
        setFetchError('Could not load benches. Please refresh.')
        setLoading(false)
        return
      }

      const posts = (data ?? []) as BenchPost[]

      // Build a map of bench id → public Supabase Storage URL
      const urls: Record<string, string> = {}
      for (const post of posts) {
        const { data: urlData } = supabase.storage
          .from('bench-images')
          .getPublicUrl(post.image_path)
        urls[post.id] = urlData.publicUrl
      }

      setBenches(posts)
      setImageUrls(urls)
      setLoading(false)
    }

    load()
  }, [])

  // Hold the grey screen until we know whether we have a location
  if (!locationReady) {
    return <div style={{ width: '100vw', height: '100vh', background: '#e5e7eb' }} />
  }

  const center = userLocation ?? DEFAULT_CENTER

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Full-screen map — starts at street level centered on user's location */}
      <MapContainer
        center={center}
        zoom={STREET_ZOOM}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapRefCapture mapRef={mapRef} />

        {/* Pulsing blue dot — user's current location */}
        {userLocation && <UserDot position={userLocation} />}

        {/* Real bench markers — rendered once Supabase data is ready */}
        {!loading &&
          benches.map(bench => (
            <BenchMarker
              key={bench.id}
              bench={bench}
              allBenches={benches}
              imageUrl={imageUrls[bench.id] ?? ''}
            />
          ))}
      </MapContainer>

      {/* Floating nav bar — pill-shaped, semi-transparent, top-right corner */}
      <nav
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 999,
          padding: '6px 10px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
        }}
        aria-label="Site navigation"
      >
        {/* Upload a bench */}
        <Link
          href="/upload"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            color: '#111',
            textDecoration: 'none',
          }}
          aria-label="Upload a bench"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </Link>

        {/* Profile / my uploads */}
        <Link
          href="/me"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            color: '#111',
            textDecoration: 'none',
          }}
          aria-label="My profile"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </nav>

      {/* Locate-me button — snaps back to user's location like Apple Maps */}
      {userLocation && (
        <button
          onClick={() =>
            mapRef.current?.flyTo(userLocation, STREET_ZOOM, { animate: true, duration: 0.8 })
          }
          aria-label="Go to my location"
          style={{
            position: 'absolute',
            bottom: 32,
            right: 16,
            zIndex: 1000,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#007AFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
        </button>
      )}

      {/* Error toast — shown when the Supabase fetch fails */}
      {fetchError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(220,38,38,0.95)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          {fetchError}
        </div>
      )}

      {/* Empty-state toast — shown when the database has no bench posts yet */}
      {!loading && !fetchError && benches.length === 0 && (
        <div
          role="status"
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(17,24,39,0.88)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          No benches nearby yet — be the first to add one!
        </div>
      )}
    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'

// BenchMap depends on Leaflet which requires browser APIs — must be client-side only
const BenchMap = dynamic(() => import('@/app/components/BenchMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', background: '#e5e7eb' }} />,
})

export default function HomePage() {
  return <BenchMap />
}

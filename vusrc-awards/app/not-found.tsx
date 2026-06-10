import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Page Not Found' }

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#03110D] flex flex-col items-center justify-center px-4 text-center">
      {/* Gold rule */}
      <div className="w-px h-16 bg-gradient-to-b from-transparent to-[#C9A84C]/60 mb-10" />

      <p className="text-[#C9A84C] text-xs font-semibold tracking-[0.3em] uppercase mb-4">
        Error 404
      </p>

      <h1
        className="text-7xl sm:text-9xl font-black tracking-tight text-white/5 select-none"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
        aria-hidden="true"
      >
        404
      </h1>

      <h2
        className="text-2xl sm:text-3xl font-semibold text-white mt-2 mb-3"
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
      >
        Page not found
      </h2>

      <p className="text-white/40 text-sm max-w-xs leading-relaxed mb-10">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943f] active:bg-[#a07c34] text-[#03110D] font-bold text-sm px-6 py-3 rounded-xl transition-colors"
      >
        ← Back to home
      </Link>

      <div className="w-px h-16 bg-gradient-to-b from-[#C9A84C]/60 to-transparent mt-10" />

      <p className="text-white/15 text-xs tracking-widest mt-2">
        VUSRC · Student Week Awards
      </p>
      <p className="text-white/8 text-[10px] tracking-[0.3em] uppercase mt-1">
        Crafted by <span className="text-[#C9A84C]/25">Dash &amp; Co.</span>
      </p>
    </div>
  )
}

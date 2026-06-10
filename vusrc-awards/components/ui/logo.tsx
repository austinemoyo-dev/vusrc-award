import Image from 'next/image'

interface LogoProps {
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Show subtitle "AWARDS" below the wordmark */
  showSub?: boolean
}

const dimensions = {
  sm: { img: 28, text: 'text-base', sub: 'text-[9px]' },
  md: { img: 36, text: 'text-xl',   sub: 'text-[10px]' },
  lg: { img: 52, text: 'text-3xl',  sub: 'text-xs' },
}

export function Logo({ src, size = 'md', className = '', showSub = true }: LogoProps) {
  const d = dimensions[size]

  if (src) {
    return (
      <Image
        src={src}
        alt="VUSRC Awards"
        width={d.img * 3}
        height={d.img}
        className={`object-contain ${className}`}
      />
    )
  }

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <span
        className={`font-serif font-black text-gold tracking-[0.15em] leading-none ${d.text}`}
        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
      >
        VUSRC
      </span>
      {showSub && (
        <span
          className={`uppercase tracking-[0.35em] text-gold/50 font-medium leading-none mt-0.5 ${d.sub}`}
        >
          Awards
        </span>
      )}
    </div>
  )
}

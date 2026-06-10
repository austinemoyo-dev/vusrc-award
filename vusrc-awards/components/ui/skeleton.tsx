interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

/** Matches the shape of a CategoryCard */
export function CategoryCardSkeleton() {
  return (
    <div className="h-52 rounded-xl border border-border bg-surface-2 p-5 flex flex-col justify-between">
      <Skeleton className="h-5 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-7 w-24 rounded-lg mt-1" />
      </div>
    </div>
  )
}

/** Matches the shape of a NomineeCard */
export function NomineeCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <Skeleton className="w-full aspect-[4/5] rounded-none" />
      <div className="p-3 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/** Matches an admin table row */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  )
}

/** Matches a results bar row */
export function ResultsBarSkeleton() {
  return (
    <div className="flex items-center gap-4 py-2">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-4 w-10 flex-shrink-0" />
    </div>
  )
}

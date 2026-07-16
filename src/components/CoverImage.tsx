import { useState } from 'react'
import { MEDIA_META } from '@/lib/media'
import type { MediaType } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Artwork with a type-icon fallback tile — covers can be null (mock mode,
 * missing art) or 404 (Cover Art Archive), so failure is a first-class state.
 */
export function CoverImage({
  src,
  alt,
  mediaType,
  className,
}: {
  src: string | null
  alt: string
  mediaType: MediaType
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const Icon = MEDIA_META[mediaType].icon

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('flex items-center justify-center rounded-md bg-muted', className)}
      >
        <Icon className="size-1/3 min-h-4 min-w-4 text-muted-foreground" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn('rounded-md object-cover', className)}
    />
  )
}

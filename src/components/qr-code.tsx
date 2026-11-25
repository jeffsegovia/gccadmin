import { useMemo } from 'react'
import { encode } from 'uqr'
import { cn } from 'cn'

/** A link as a QR code: plain dark squares on white, which every scanner
 * reads in either theme. */
export function QrCode({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const path = useMemo(() => {
    if (!value) return { d: '', n: 1 }
    const qr = encode(value, { ecc: 'M', border: 0 })
    let d = ''
    for (let y = 0; y < qr.size; y++)
      for (let x = 0; x < qr.size; x++)
        if (qr.data[y][x]) d += `M${x} ${y}h1v1h-1z`
    return { d, n: qr.size }
  }, [value])
  return (
    <svg
      role="img"
      aria-label="QR code of the link"
      viewBox={`0 0 ${path.n} ${path.n}`}
      shapeRendering="crispEdges"
      className={cn('block', className)}
    >
      <path d={path.d} fill="#0a0a0a" />
    </svg>
  )
}

import type { SVGProps } from 'react';

/**
 * Chessy brand mark: a compact C-shaped orbit around a knight head.
 * The geometry is intentionally asymmetric so it stays recognizable at app-icon size
 * instead of reading as another generic crown, shield, or trophy.
 */
export function ChessyMark({ size = 28, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  const labelled = Boolean(props['aria-label']);
  return <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={size <= 18 ? 1.95 : 1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={labelled ? 'img' : undefined}
    aria-hidden={labelled ? undefined : true}
    {...props}
  >
    <path d="M18.6 6.3A8.35 8.35 0 1 0 18.7 17.6" />
    <path d="M8.25 18.25h8.95M9.15 16.25h7.1c.35-2.15-.3-3.9-1.95-5.2l1.55-2.05c-1.9-.72-3.02-2.05-3.35-4-2.15.62-3.45 1.98-3.48 4.02 0 1.48.62 2.72 1.88 3.72-1.12.65-1.7 1.82-1.75 3.51Z" />
    <path d="m9.35 8.75 2.05.78-1.75 1.18" />
    <circle cx="12.2" cy="7.45" r=".72" fill="currentColor" stroke="none" />
  </svg>;
}

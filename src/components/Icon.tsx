import type { ReactNode } from 'react'

const PATHS = {
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  prev: (
    <>
      <path d="M18 5v14L8 12z" fill="currentColor" stroke="none" />
      <path d="M6 5v14" />
    </>
  ),
  next: (
    <>
      <path d="M6 5v14l10-7z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </>
  ),
  reset: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4v5h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  volume: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
      <path d="M17 9.5l5 5M22 9.5l-5 5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sliders: (
    <>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-8 8c0 2.8 1.4 4.6 3 5.6V20h10v-3.4c1.6-1 3-2.8 3-5.6a8 8 0 0 0-8-8z" />
      <circle cx="9" cy="11.5" r="1.7" fill="currentColor" />
      <circle cx="15" cy="11.5" r="1.7" fill="currentColor" />
      <path d="M10.5 20v-2.5M13.5 20v-2.5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M9.5 7V4h5v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  camera: (
    <>
      <path d="M3.5 8h3.5l2-3h6l2 3h3.5v11h-17z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  dollar: (
    <path d="M12 3v18M16.5 7.5c-.9-1.4-2.5-2-4.5-2-2.6 0-4.5 1.3-4.5 3.2 0 4.6 9.5 2.3 9.5 7 0 2-2 3.3-5 3.3-2.1 0-3.8-.7-4.8-2.2" />
  ),
  chips: (
    <>
      <ellipse cx="12" cy="7" rx="8" ry="3.5" />
      <path d="M4 7v5c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V7M4 12v5c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5v-5" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M6 14h1M9 14h6M17 14h1" />
    </>
  ),
  exit: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  swap: <path d="M4 8h14l-4-4M20 16H6l4 4" />,
  coffee: (
    <>
      <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8 20h8M9.5 17h5v3h-5z" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}

import type { ReactNode } from 'react';

type IconName =
  | 'split'
  | 'clear'
  | 'sun'
  | 'moon'
  | 'archive'
  | 'copy'
  | 'check'
  | 'download'
  | 'chevronDown'
  | 'chevronUp';

interface CustomIconProps {
  name: IconName;
  className?: string;
}

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function glyph(name: IconName): ReactNode {
  switch (name) {
    case 'split':
      return (
        <>
          <path d="M4 6h6" />
          <path d="M4 18h6" />
          <path d="M10 6c5 0 5 12 10 12" />
          <path d="M10 18c5 0 5-12 10-12" />
        </>
      );
    case 'clear':
      return (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6l-12 12" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
          <path d="M4.9 4.9l2.1 2.1" />
          <path d="M17 17l2.1 2.1" />
          <path d="M4.9 19.1l2.1-2.1" />
          <path d="M17 7l2.1-2.1" />
        </>
      );
    case 'moon':
      return <path d="M14.5 3a9 9 0 1 0 6.5 14.5A8 8 0 1 1 14.5 3z" />;
    case 'archive':
      return (
        <>
          <path d="M3 7h18" />
          <path d="M5 7l1 13h12l1-13" />
          <path d="M9 12h6" />
          <path d="M10.5 7V4h3v3" />
        </>
      );
    case 'copy':
      return (
        <>
          <path d="M9 9h11v11H9z" />
          <path d="M4 4h11v11" />
        </>
      );
    case 'check':
      return <path d="M5 13l4 4L19 7" />;
    case 'download':
      return (
        <>
          <path d="M12 4v11" />
          <path d="M8 11l4 4 4-4" />
          <path d="M4 20h16" />
        </>
      );
    case 'chevronUp':
      return <path d="M6 15l6-6 6 6" />;
    case 'chevronDown':
      return <path d="M6 9l6 6 6-6" />;
    default:
      return null;
  }
}

export default function CustomIcon({ name, className = 'w-4 h-4' }: CustomIconProps) {
  return <IconBase className={className}>{glyph(name)}</IconBase>;
}

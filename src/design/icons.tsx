import type { SVGProps } from 'react';

export type ChessyIconName =
  | 'home' | 'play' | 'challenges' | 'academy' | 'progress' | 'library'
  | 'games' | 'analysis' | 'review' | 'theme' | 'settings' | 'language'
  | 'profile' | 'streak' | 'xp' | 'achievement' | 'hint' | 'share'
  | 'save' | 'import' | 'export' | 'sound' | 'engine' | 'timer'
  | 'menu' | 'close' | 'arrow' | 'check' | 'shield' | 'spark' | 'target';

export interface ChessyIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: ChessyIconName;
  size?: number;
  filled?: boolean;
}

const Dot = ({ cx, cy, r = 1.25 }: { cx: number; cy: number; r?: number }) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

export function ChessyIcon({ name, size = 22, filled = false, ...props }: ChessyIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': props['aria-label'] ? undefined : true,
  };
  const activeFill = filled ? 'currentColor' : 'none';
  const activeStroke = filled ? 'var(--icon-on-accent, #0d1812)' : 'currentColor';

  const glyph = (() => {
    switch (name) {
      case 'home': return <><path d="M3.8 10.7 12 3.8l8.2 6.9v8.6a1.4 1.4 0 0 1-1.4 1.4H5.2a1.4 1.4 0 0 1-1.4-1.4z" fill={activeFill} stroke={filled ? 'currentColor' : undefined}/><path d="M9.2 20.7v-6.5h5.6v6.5" stroke={filled ? activeStroke : undefined}/></>;
      case 'play': return <><path d="M8.8 20.1h8.6M7.3 17.8h11.9M8.6 17.8c.2-2.7 1.5-4.7 4-5.8-1.5-1.2-2.4-2.7-2.4-4.5 0-2.4 1.5-4 4-4.7.2 2.2 1.3 3.8 3.5 4.6l-1.8 2.3c2.1 1.6 3 4.3 2.2 8.1M10.5 7.2l-2.2 1.5 2.8 1.1"/></>;
      case 'challenges': return <><circle cx="12" cy="12" r="8.2" fill={filled ? 'currentColor' : 'none'}/><circle cx="12" cy="12" r="4.3" stroke={filled ? activeStroke : undefined}/><Dot cx={12} cy={12} r={1.6}/><path d="M18 6 21 3M18 3h3v3"/></>;
      case 'academy': return <><path d="m3.2 9 8.8-4.2L20.8 9 12 13.2z" fill={filled ? 'currentColor' : 'none'}/><path d="M6.2 11.1v5.2c3.5 2.4 8.1 2.4 11.6 0v-5.2M20.8 9v6.2" stroke={filled ? activeStroke : undefined}/></>;
      case 'progress': return <><path d="M4 19.5V14h3.3v5.5H4Zm6.3 0V9.7h3.4v9.8h-3.4Zm6.4 0V4.5H20v15h-3.3Z" fill={filled ? 'currentColor' : 'none'}/><path d="m4.2 10.2 4-3 3.3 1.7 6-5.2M15.2 3.7h2.3V6"/></>;
      case 'library': return <><path d="M4.5 5.5c2.8-.8 5.2-.3 7.5 1.4v12c-2.3-1.7-4.7-2.2-7.5-1.4z" fill={filled ? 'currentColor' : 'none'}/><path d="M19.5 5.5c-2.8-.8-5.2-.3-7.5 1.4v12c2.3-1.7 4.7-2.2 7.5-1.4z" fill={filled ? 'currentColor' : 'none'}/></>;
      case 'games': return <><rect x="4" y="3.8" width="16" height="16.4" rx="2.2" fill={filled ? 'currentColor' : 'none'}/><path d="M8 8h8M8 12h8M8 16h5" stroke={filled ? activeStroke : undefined}/></>;
      case 'analysis': return <><path d="M4 18.8 8.2 13l3 2.4 4.4-7.1L20 5.2"/><path d="M16.2 5.2H20v3.7"/><circle cx="8.2" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="8.3" r="1.1" fill="currentColor" stroke="none"/></>;
      case 'review': return <><path d="M6.2 18.7c4.7 1.7 9.8-.7 11.5-5.4 1.7-4.7-.7-9.8-5.4-11.5"/><path d="M5.8 5.3v4.4h4.4"/><path d="m9.3 12 1.8 1.8 4-4.2"/></>;
      case 'theme': return <><circle cx="12" cy="12" r="8.6"/><path d="M12 3.4a8.6 8.6 0 0 1 0 17.2z" fill={filled ? 'currentColor' : 'none'}/></>;
      case 'settings': return <><circle cx="12" cy="12" r="2.5"/><path d="m19 13.5 1.4 1.1-1.8 3.1-1.8-.7a7 7 0 0 1-2.1 1.2l-.3 1.9h-3.6l-.3-1.9A7 7 0 0 1 8.4 17l-1.8.7-1.8-3.1 1.4-1.1a7.4 7.4 0 0 1 0-2.5L4.8 9.9l1.8-3.1 1.8.7a7 7 0 0 1 2.1-1.2l.3-1.9h3.6l.3 1.9a7 7 0 0 1 2.1 1.2l1.8-.7 1.8 3.1-1.4 1.1a7.4 7.4 0 0 1 0 2.5Z"/></>;
      case 'language': return <><circle cx="12" cy="12" r="8.7"/><path d="M3.7 12h16.6M12 3.3c2.4 2.5 3.7 5.4 3.7 8.7S14.4 18.2 12 20.7c-2.4-2.5-3.7-5.4-3.7-8.7S9.6 5.8 12 3.3Z"/></>;
      case 'profile': return <><circle cx="12" cy="8.3" r="3.2" fill={filled ? 'currentColor' : 'none'}/><path d="M5.3 20.2c.7-4 3-6 6.7-6s6 2 6.7 6" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'currentColor' : undefined}/></>;
      case 'streak': return <><path d="M13.8 3.1c.4 3.6-2.9 4.9-2.1 8.2 1.3-1.3 2.6-2.1 3.8-3.8 2.5 2.5 3.5 5 2.6 7.7-1 3.2-3.9 5.3-7.3 4.7-3.9-.7-6.1-4.1-5.3-7.9.5-2.5 2.2-4.4 4.4-6.3-.1 2 .2 3.1 1.2 4 0-3.2 1.7-4.7 2.7-6.6Z" fill={filled ? 'currentColor' : 'none'}/></>;
      case 'xp': return <path d="m13.2 2.8-7.1 10h5.1l-.8 8.4 7.5-11h-5.2z" fill={filled ? 'currentColor' : 'none'}/>;
      case 'achievement': return <><path d="m5 8 3.8 2.2L12 4l3.2 6.2L19 8l-1.2 9H6.2z" fill={filled ? 'currentColor' : 'none'}/><path d="M7 20h10"/></>;
      case 'hint': return <><path d="M8.2 15.3c-1.4-1.1-2.3-2.8-2.3-4.7a6.1 6.1 0 0 1 12.2 0c0 1.9-.9 3.6-2.3 4.7-.7.6-1 1.1-1.1 1.9H9.3c-.1-.8-.4-1.3-1.1-1.9Z"/><path d="M9.5 20h5"/></>;
      case 'share': return <><circle cx="6" cy="12" r="2"/><circle cx="17.5" cy="5.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/><path d="m7.8 11 7.8-4.5M7.8 13l7.8 4.5"/></>;
      case 'save': return <><path d="M5 3.8h11l3 3v13.4H5z" fill={filled ? 'currentColor' : 'none'}/><path d="M8 3.8v5h7v-5M8.5 20.2v-6.3h7v6.3" stroke={filled ? activeStroke : undefined}/></>;
      case 'import': return <><path d="M12 4v11M8 11l4 4 4-4M5 19.5h14"/></>;
      case 'export': return <><path d="M12 15V4M8 8l4-4 4 4M5 19.5h14"/></>;
      case 'sound': return <><path d="M4.5 10h3l4-3.5v11l-4-3.5h-3z" fill={filled ? 'currentColor' : 'none'}/><path d="M15 9.1c1.7 1.5 1.7 4.3 0 5.8M17.5 6.6c3.3 3 3.3 7.8 0 10.8"/></>;
      case 'engine': return <><rect x="5" y="5" width="14" height="14" rx="3" fill={filled ? 'currentColor' : 'none'}/><path d="M9 9h6v6H9zM8 2.8v2.1M12 2.8v2.1M16 2.8v2.1M8 19.1v2.1M12 19.1v2.1M16 19.1v2.1M2.8 8h2.1M2.8 12h2.1M2.8 16h2.1M19.1 8h2.1M19.1 12h2.1M19.1 16h2.1" stroke={filled ? activeStroke : undefined}/></>;
      case 'timer': return <><circle cx="12" cy="13" r="7.2"/><path d="M9 2.8h6M12 5.8V3M17.3 7.6l1.7-1.7M12 13l3-2"/></>;
      case 'menu': return <path d="M4 7h16M4 12h16M4 17h16"/>;
      case 'close': return <path d="m5 5 14 14M19 5 5 19"/>;
      case 'arrow': return <path d="M4 12h15M14 7l5 5-5 5"/>;
      case 'check': return <path d="m5 12.3 4.2 4.2L19 6.8"/>;
      case 'shield': return <path d="M12 3.2 19 6v5.5c0 4.5-2.6 7.6-7 9.3-4.4-1.7-7-4.8-7-9.3V6z" fill={filled ? 'currentColor' : 'none'}/>;
      case 'spark': return <><path d="M12 3.3c.7 4.3 2.4 6 6.7 6.7-4.3.7-6 2.4-6.7 6.7-.7-4.3-2.4-6-6.7-6.7 4.3-.7 6-2.4 6.7-6.7Z" fill={filled ? 'currentColor' : 'none'}/><Dot cx={18.3} cy={17.8} r={1}/></>;
      case 'target': return <><circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.2"/><Dot cx={12} cy={12} r={1.6}/></>;
      default: return null;
    }
  })();

  return <svg {...common} {...props}>{glyph}</svg>;
}

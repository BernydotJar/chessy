import type { SVGProps } from 'react';

export type ChessyIconName =
  | 'home' | 'play' | 'challenges' | 'academy' | 'progress' | 'library'
  | 'games' | 'analysis' | 'review' | 'theme' | 'settings' | 'language'
  | 'profile' | 'streak' | 'xp' | 'achievement' | 'hint' | 'share'
  | 'save' | 'import' | 'export' | 'sound' | 'engine' | 'timer'
  | 'menu' | 'close' | 'arrow' | 'check' | 'shield' | 'spark' | 'target';

export const PRIMARY_ICON_NAMES: readonly ChessyIconName[] = [
  'home','play','challenges','academy','progress','library','games','analysis','review'
] as const;

export interface ChessyIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: ChessyIconName;
  size?: number;
  filled?: boolean;
}

const Dot = ({ cx, cy, r = 1.2 }: { cx: number; cy: number; r?: number }) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

/** Optical stroke compensation keeps 18px mobile icons from looking lighter than 24px desktop icons. */
const strokeForSize = (size: number) => size <= 18 ? 1.95 : size <= 20 ? 1.86 : 1.78;

export function ChessyIcon({ name, size = 22, filled = false, ...props }: ChessyIconProps) {
  const labelled = Boolean(props['aria-label']);
  const activeFill = filled ? 'currentColor' : 'none';
  const innerStroke = filled ? 'var(--icon-on-accent, #0d1812)' : 'currentColor';
  const glyph = (() => {
    switch (name) {
      // Primary navigation icons use chess-native or task-native silhouettes and share an optical 3.5-20.5 box.
      case 'home': return <><path d="m4.2 10.2 7.8-6.35 7.8 6.35v9.15a1.15 1.15 0 0 1-1.15 1.15H5.35a1.15 1.15 0 0 1-1.15-1.15Z" fill={activeFill}/><path d="M9.25 20.5v-6.15h5.5v6.15" stroke={innerStroke}/><path d="M8 9.2h8" opacity=".72" stroke={innerStroke}/></>;
      case 'play': return <><path d="M7.35 20.2h10.9M8.3 17.8h8.95c.4-2.7-.35-4.85-2.2-6.4l1.8-2.35c-2.15-.8-3.45-2.3-3.82-4.55-2.45.7-3.92 2.25-3.95 4.55 0 1.65.72 3.05 2.15 4.15-1.62.9-2.6 2.45-2.93 4.6Z" fill={filled ? 'currentColor' : 'none'}/><path d="m9.4 8.75 2.35.9-2 1.3" stroke={innerStroke}/><Dot cx={12.7} cy={7.3} r={.72}/></>;
      case 'challenges': return <><rect x="4" y="4" width="16" height="16" rx="2.3" fill={activeFill}/><path d="M12 4v16M4 12h16" stroke={innerStroke} opacity=".72"/><circle cx="14.9" cy="9.1" r="3.25" fill={filled ? 'var(--icon-on-accent, #0d1812)' : 'none'} stroke={innerStroke}/><Dot cx={14.9} cy={9.1} r={1.05}/><path d="m17.25 6.75 2.1-2.1M17.4 4.65h1.95v1.95" stroke={innerStroke}/></>;
      case 'academy': return <><path d="M4.25 5.4c3.05-.82 5.6-.2 7.75 1.55v12c-2.15-1.75-4.7-2.37-7.75-1.55Z" fill={activeFill}/><path d="M19.75 5.4c-3.05-.82-5.6-.2-7.75 1.55v12c2.15-1.75 4.7-2.37 7.75-1.55Z" fill={activeFill}/><path d="M12 9.2c1.55.45 2.42 1.3 2.65 2.55-.72.22-1.2.63-1.48 1.2h-2.34c-.28-.57-.76-.98-1.48-1.2.23-1.25 1.1-2.1 2.65-2.55Z" stroke={innerStroke}/></>;
      case 'progress': return <><path d="M4.1 19.8h15.8"/><path d="M5.35 19.8v-4.6h3.3v4.6M10.35 19.8v-8h3.3v8M15.35 19.8V7.2h3.3v12.6" fill={activeFill}/><path d="m5.2 11.15 4-3.05 3.25 1.7 5.4-5.05M15.7 4.75h2.15V6.9"/></>;
      case 'library': return <><path d="M4.15 5.25c3.05-.82 5.65-.28 7.85 1.55v12.15c-2.2-1.82-4.8-2.37-7.85-1.55Z" fill={activeFill}/><path d="M19.85 5.25c-3.05-.82-5.65-.28-7.85 1.55v12.15c2.2-1.82 4.8-2.37 7.85-1.55Z" fill={activeFill}/><path d="M7.15 9h2.35M14.5 9h2.35M7.15 12h2.35M14.5 12h2.35" stroke={innerStroke}/></>;
      case 'games': return <><rect x="4.2" y="3.8" width="15.6" height="16.4" rx="2.1" fill={activeFill}/><path d="M7.5 8.1h2.6M12.1 8.1h4.4M7.5 12h2.6M12.1 12h4.4M7.5 15.9h2.6M12.1 15.9h4.4" stroke={innerStroke}/><circle cx="8.8" cy="8.1" r="1.05" fill={filled ? 'var(--icon-on-accent, #0d1812)' : 'currentColor'} stroke="none"/></>;
      case 'analysis': return <><rect x="3.9" y="4.1" width="16.2" height="15.8" rx="2.2" fill={activeFill}/><path d="M7.1 16.3 10.1 12l2.5 2 4.35-6.25" stroke={innerStroke}/><path d="M14.8 7.75h2.15V9.9" stroke={innerStroke}/><path d="M6.8 8.2h3" stroke={innerStroke} opacity=".72"/></>;
      case 'review': return <><path d="M6.1 6.6A7.7 7.7 0 1 1 5 14.35"/><path d="M4.8 4.55v4.3h4.3"/><path d="m8.8 12.1 2.15 2.15 4.65-4.9"/><path d="M17.1 17.7h2.1" opacity=".72"/></>;

      case 'theme': return <><circle cx="12" cy="12" r="8.6"/><path d="M12 3.4a8.6 8.6 0 0 1 0 17.2z" fill={filled ? 'currentColor' : 'none'}/></>;
      case 'settings': return <><circle cx="12" cy="12" r="2.5"/><path d="m19 13.5 1.4 1.1-1.8 3.1-1.8-.7a7 7 0 0 1-2.1 1.2l-.3 1.9h-3.6l-.3-1.9A7 7 0 0 1 8.4 17l-1.8.7-1.8-3.1 1.4-1.1a7.4 7.4 0 0 1 0-2.5L4.8 9.9l1.8-3.1 1.8.7a7 7 0 0 1 2.1-1.2l.3-1.9h3.6l.3 1.9a7 7 0 0 1 2.1 1.2l1.8-.7 1.8 3.1-1.4 1.1a7.4 7.4 0 0 1 0 2.5Z"/></>;
      case 'language': return <><circle cx="12" cy="12" r="8.7"/><path d="M3.7 12h16.6M12 3.3c2.4 2.5 3.7 5.4 3.7 8.7S14.4 18.2 12 20.7c-2.4-2.5-3.7-5.4-3.7-8.7S9.6 5.8 12 3.3Z"/></>;
      case 'profile': return <><circle cx="12" cy="8.3" r="3.2" fill={filled ? 'currentColor' : 'none'}/><path d="M5.3 20.2c.7-4 3-6 6.7-6s6 2 6.7 6" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'currentColor' : undefined}/></>;
      case 'streak': return <path d="M13.8 3.1c.4 3.6-2.9 4.9-2.1 8.2 1.3-1.3 2.6-2.1 3.8-3.8 2.5 2.5 3.5 5 2.6 7.7-1 3.2-3.9 5.3-7.3 4.7-3.9-.7-6.1-4.1-5.3-7.9.5-2.5 2.2-4.4 4.4-6.3-.1 2 .2 3.1 1.2 4 0-3.2 1.7-4.7 2.7-6.6Z" fill={filled ? 'currentColor' : 'none'}/>;
      case 'xp': return <path d="m13.2 2.8-7.1 10h5.1l-.8 8.4 7.5-11h-5.2z" fill={filled ? 'currentColor' : 'none'}/>;
      case 'achievement': return <><path d="m5 8 3.8 2.2L12 4l3.2 6.2L19 8l-1.2 9H6.2z" fill={filled ? 'currentColor' : 'none'}/><path d="M7 20h10"/></>;
      case 'hint': return <><path d="M8.2 15.3c-1.4-1.1-2.3-2.8-2.3-4.7a6.1 6.1 0 0 1 12.2 0c0 1.9-.9 3.6-2.3 4.7-.7.6-1 1.1-1.1 1.9H9.3c-.1-.8-.4-1.3-1.1-1.9Z"/><path d="M9.5 20h5"/></>;
      case 'share': return <><circle cx="6" cy="12" r="2"/><circle cx="17.5" cy="5.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/><path d="m7.8 11 7.8-4.5M7.8 13l7.8 4.5"/></>;
      case 'save': return <><path d="M5 3.8h11l3 3v13.4H5z" fill={filled ? 'currentColor' : 'none'}/><path d="M8 3.8v5h7v-5M8.5 20.2v-6.3h7v6.3" stroke={innerStroke}/></>;
      case 'import': return <><path d="M12 4v11M8 11l4 4 4-4M5 19.5h14"/></>;
      case 'export': return <><path d="M12 15V4M8 8l4-4 4 4M5 19.5h14"/></>;
      case 'sound': return <><path d="M4.5 10h3l4-3.5v11l-4-3.5h-3z" fill={filled ? 'currentColor' : 'none'}/><path d="M15 9.1c1.7 1.5 1.7 4.3 0 5.8M17.5 6.6c3.3 3 3.3 7.8 0 10.8"/></>;
      case 'engine': return <><rect x="5" y="5" width="14" height="14" rx="3" fill={filled ? 'currentColor' : 'none'}/><path d="M9 9h6v6H9zM8 2.8v2.1M12 2.8v2.1M16 2.8v2.1M8 19.1v2.1M12 19.1v2.1M16 19.1v2.1M2.8 8h2.1M2.8 12h2.1M2.8 16h2.1M19.1 8h2.1M19.1 12h2.1M19.1 16h2.1" stroke={innerStroke}/></>;
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

  return <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeForSize(size)}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={labelled ? 'img' : undefined}
    aria-hidden={labelled ? undefined : true}
    {...props}
  >{glyph}</svg>;
}

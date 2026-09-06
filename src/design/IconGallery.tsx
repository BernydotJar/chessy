import { ChessyMark } from './ChessyMark';
import { ChessyIcon, PRIMARY_ICON_NAMES } from './icons';

/** Deterministic verification surface used by tests and visual review; it is not part of product navigation. */
export function IconGallery() {
  const sizes = [18, 20, 22, 24] as const;
  return <section data-testid="chessy-icon-gallery" aria-label="Chessy Icon System v3">
    <div data-icon="brand">{sizes.map(size => <ChessyMark key={size} size={size} aria-label={`Chessy mark ${size}`} />)}</div>
    {PRIMARY_ICON_NAMES.map(name => <div key={name} data-icon={name}>
      {sizes.map(size => <ChessyIcon key={`${name}-${size}`} name={name} size={size} aria-label={`${name} ${size}`} />)}
      <ChessyIcon name={name} size={22} filled aria-label={`${name} selected`} />
    </div>)}
  </section>;
}

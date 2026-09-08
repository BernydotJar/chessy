import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useTranslation } from 'react-i18next';

export const MoveHistory: React.FC = () => {
  const { history } = useGameStore();
  const { t } = useTranslation();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [history.length]);

  const rows: { moveNumber: number; white: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) rows.push({ moveNumber: Math.floor(i / 2) + 1, white: history[i], black: history[i + 1] });

  return <div className="move-history-v3" aria-live="polite">
    {rows.length === 0 ? <p className="move-history-empty">{t('history.noMoves')}</p> : <div className="move-history-list">
      {rows.map((row, index) => <div className={`move-history-row ${index === rows.length - 1 ? 'is-latest' : ''}`} key={row.moveNumber}>
        <span className="move-number">{row.moveNumber}.</span>
        <span className="move-san white">{row.white}</span>
        <span className="move-san black">{row.black ?? '—'}</span>
      </div>)}
      <div ref={end}/>
    </div>}
  </div>;
};

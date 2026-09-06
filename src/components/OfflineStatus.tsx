import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../design/icons';

export function OfflineStatus(){
  const {t}=useTranslation();
  const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine);
  useEffect(()=>{const sync=()=>setOnline(navigator.onLine);window.addEventListener('online',sync);window.addEventListener('offline',sync);return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);};},[]);
  if(online)return null;
  return <span className="offline-status" role="status"><ChessyIcon name="shield" size={15}/>{t('studio.offline')}</span>;
}

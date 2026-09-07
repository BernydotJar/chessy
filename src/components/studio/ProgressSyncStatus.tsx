import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store';
import { ChessyIcon } from '../../design/icons';
import { useProgressSyncStore, type ProgressSyncStatus as SyncStatus } from '../../sync/store';

const iconForStatus = (status: SyncStatus) => status === 'synced' ? 'check' : status === 'error' ? 'shield' : status === 'local-only' ? 'save' : 'progress';

export function ProgressSyncStatus({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const { status, lastSyncedAt, error, syncNow } = useProgressSyncStore();
  const signedIn = authStatus === 'signed-in';
  const effectiveStatus: SyncStatus = signedIn ? status : 'local-only';
  const time = lastSyncedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || 'es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastSyncedAt))
    : null;

  return <section className={`sync-status sync-status--${effectiveStatus} ${compact ? 'sync-status--compact' : ''}`} aria-live="polite">
    <div className="sync-status-icon" aria-hidden="true"><ChessyIcon name={iconForStatus(effectiveStatus)} size={22}/></div>
    <div className="sync-status-copy">
      <p className="eyebrow">{t('sync.label')}</p>
      <strong>{t(`sync.status.${effectiveStatus}`)}</strong>
      <span>{t(error === 'cloud-delete' ? 'sync.detail.cloud-delete' : `sync.detail.${effectiveStatus}`)}</span>
      {time && <small>{t('sync.last', { time })}</small>}
    </div>
    {signedIn && effectiveStatus !== 'syncing' && effectiveStatus !== 'synced' && error !== 'cloud-delete' &&
      <button type="button" className="btn quiet sync-retry" onClick={() => void syncNow()}>{t('sync.retry')}</button>}
  </section>;
}

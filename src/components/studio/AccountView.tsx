import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../../design/icons';
import { useAuthStore } from '../../auth/store';
import { useProgressSyncStore } from '../../sync/store';
import { SectionHeading } from './Shared';
import { ProgressSyncStatus } from './ProgressSyncStatus';
import { useAnalyticsStore } from '../../analytics/store';

export function AccountView() {
  const { t } = useTranslation();
  const { status, user, busy, error, notice, signInWithEmail, createAccount, signInWithGoogle, resetPassword, signOut, deleteCurrentAccount, clearFeedback } = useAuthStore();
  const syncStatus = useProgressSyncStore((state) => state.status);
  const syncError = useProgressSyncStore((state) => state.error);
  const deleteCloudProgress = useProgressSyncStore((state) => state.deleteCloudProgress);
  const track = useAnalyticsStore((state) => state.track);
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6 && !busy, [email, password, busy]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    const ok = mode === 'signin' ? await signInWithEmail(email.trim(), password) : await createAccount(email.trim(), password, displayName.trim());
    if (ok) track('auth_success', { provider: 'password', method: mode === 'signin' ? 'signin' : 'create' });
  };

  const handleGoogle = async () => {
    clearFeedback();
    const ok = await signInWithGoogle();
    if (ok) track('auth_success', { provider: 'google', method: 'signin' });
  };

  const handleDelete = async () => {
    clearFeedback();
    const cloudDeleted = await deleteCloudProgress();
    if (!cloudDeleted) return;
    await deleteCurrentAccount();
  };

  if (status === 'booting') return <div className="view-enter"><SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.loading')}/><div className="panel account-state"><ChessyIcon name="profile" size={32}/><p>{t('auth.loading')}</p></div></div>;

  if (status === 'unconfigured') return <div className="view-enter"><SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.subtitle')}/><section className="panel account-state account-unconfigured"><ChessyIcon name="shield" size={34}/><div><h2>{t('auth.notConnectedTitle')}</h2><p>{t('auth.notConnectedBody')}</p><p className="fine-print">{t('auth.localStillWorks')}</p></div></section></div>;

  if (status === 'signed-in' && user) return <div className="view-enter">
    <SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.signedInSubtitle')}/>
    <div className="account-grid">
      <section className="panel account-profile"><div className="account-avatar" aria-hidden="true">{user.photoUrl ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer"/> : <ChessyIcon name="profile" size={34}/>}</div><div><p className="eyebrow">{t('auth.signedInAs')}</p><h2>{user.displayName || user.email || t('auth.player')}</h2>{user.email && <p className="muted">{user.email}</p>}<p className="fine-print">{t('auth.providerLabel')}: {t(`auth.provider.${user.provider}`)}</p></div></section>
      <section className="panel account-actions"><h2>{t('auth.accountActions')}</h2><ProgressSyncStatus compact/><p className="muted">{t('auth.progressLocal')}</p><button className="btn secondary" disabled={busy || syncStatus === 'syncing'} onClick={() => signOut()}>{t('auth.signOut')}</button><div className="account-danger"><h3>{t('auth.deleteTitle')}</h3><p className="fine-print">{t('auth.deleteBody')}</p>{!confirmDelete ? <button className="btn quiet" disabled={busy || syncStatus === 'syncing'} onClick={() => setConfirmDelete(true)}>{t('auth.deleteAccount')}</button> : <div className="button-row"><button className="btn danger" disabled={busy || syncStatus === 'syncing'} onClick={() => void handleDelete()}>{t('auth.confirmDelete')}</button><button className="btn quiet" disabled={busy || syncStatus === 'syncing'} onClick={() => setConfirmDelete(false)}>{t('auth.cancel')}</button></div>}</div></section>
    </div>
    {syncError === 'cloud-delete' && <p className="feedback wrong" role="alert">{t('sync.cloudDeleteError')}</p>}
    {error && <p className="feedback wrong" role="alert">{t(`auth.errors.${error}`)}</p>}{notice && <p className="feedback success" role="status">{t(`auth.notices.${notice}`)}</p>}
  </div>;

  return <div className="view-enter"><SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.subtitle')}/><div className="account-auth-layout"><section className="panel account-login-card"><div className="segmented account-tabs" aria-label={t('auth.modeLabel')}><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); clearFeedback(); }}>{t('auth.signIn')}</button><button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); clearFeedback(); }}>{t('auth.create')}</button></div><form className="account-form" onSubmit={submit}>{mode === 'create' && <label>{t('auth.displayName')}<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80}/></label>}<label>{t('auth.email')}<input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>{t('auth.password')}<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)}/></label><button className="btn primary full" disabled={!canSubmit}>{busy ? t('auth.working') : t(mode === 'signin' ? 'auth.signIn' : 'auth.create')}</button></form><div className="account-divider"><span>{t('auth.or')}</span></div><button className="btn secondary full" disabled={busy} onClick={() => void handleGoogle()}><span className="google-mark" aria-hidden="true">G</span>{t('auth.google')}</button>{mode === 'signin' && <button className="text-button account-reset" disabled={busy || !email.trim()} onClick={() => resetPassword(email.trim())}>{t('auth.resetPassword')}</button>}{error && <p className="feedback wrong" role="alert">{t(`auth.errors.${error}`)}</p>}{notice && <p className="feedback success" role="status">{t(`auth.notices.${notice}`)}</p>}</section><aside className="panel account-local-note"><ChessyIcon name="shield" size={30}/><h2>{t('auth.localFirstTitle')}</h2><p>{t('auth.localFirstBody')}</p><ul><li>{t('auth.localPoint1')}</li><li>{t('auth.localPoint2')}</li><li>{t('auth.localPoint3')}</li></ul></aside></div></div>;
}

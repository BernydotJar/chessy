import { FormEvent, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChessyIcon } from '../../design/icons';
import { useAuthStore } from '../../auth/store';
import { useProgressSyncStore } from '../../sync/store';
import { SectionHeading } from './Shared';
import { ProgressSyncStatus } from './ProgressSyncStatus';
import { useAnalyticsStore } from '../../analytics/store';
import { useLearningStore, guestProgressCanImport, forgetStoredProfile } from '../../learning/store';
import { useGameStore } from '../../store/gameStore';
import { hasRoomParticipation, eraseAllMyGuardianReviews } from '../../rooms/cloud';
import { roomDataMayExist } from '../../rooms/release';

export function AccountView() {
  const { t } = useTranslation();
  const { status, user, busy, error, notice, signInWithEmail, createAccount, signInWithGoogle, resetPassword, sendVerificationEmail, refreshVerification, signOut, deleteCurrentAccount, clearFeedback } = useAuthStore();
  const syncStatus = useProgressSyncStore((state) => state.status);
  const syncError = useProgressSyncStore((state) => state.error);
  const deleteCloudProgress = useProgressSyncStore((state) => state.deleteCloudProgress);
  const track = useAnalyticsStore((state) => state.track);
  const progress = useLearningStore((state) => state.progress);
  const mergeGuestProgress = useLearningStore((state) => state.mergeGuestProgress);
  const [guestImportMessage, setGuestImportMessage] = useState<'success' | 'error' | null>(null);
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [accountKind, setAccountKind] = useState<'adult' | 'guardian' | 'minor'>('adult');
  const [verificationMessage, setVerificationMessage] = useState(false);
  const [roomsMustBeRemoved, setRoomsMustBeRemoved] = useState(false);
  const setView = useGameStore(state => state.setView);
  const invitePending = (() => { try { return !!sessionStorage.getItem('chessy-pending-room-invitation-v1'); } catch { return false; } })();
  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 6 && !busy && (mode !== 'create' || accountKind !== 'minor'), [email, password, busy, mode, accountKind]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    if (mode === 'create' && accountKind === 'minor') return;
    const ok = mode === 'signin' ? await signInWithEmail(email.trim(), password) : await createAccount(email.trim(), password, displayName.trim());
    if (ok) track('auth_success', { provider: 'password', method: mode === 'signin' ? 'signin' : 'create' });
  };

  const handleGoogle = async () => {
    clearFeedback();
    const ok = await signInWithGoogle();
    if (ok) track('auth_success', { provider: 'google', method: 'signin' });
  };

  const handleDelete = async () => {
    if (!user) return;
    clearFeedback();
    if(roomDataMayExist){
      // Once any private room data may exist, fail closed on verification errors.
      try {
        if (await hasRoomParticipation()) {
          setRoomsMustBeRemoved(true);
          return;
        }
      } catch {
        setRoomsMustBeRemoved(true);
        return;
      }
      try {
        await eraseAllMyGuardianReviews();
      } catch {
        setRoomsMustBeRemoved(true);
        return;
      }
    }
    // First public pilot has no deployed room backend. Nonexistent Functions
    // must not permanently block deletion of an existing Chessy account.
    setRoomsMustBeRemoved(false);
    const cloudDeleted = await deleteCloudProgress();
    if (!cloudDeleted) return;
    const deleted = await deleteCurrentAccount();
    if (deleted) {
      forgetStoredProfile(user.id);
    } else {
      // Firebase may require recent reauthentication. Restore cloud data if deletion failed.
      await useProgressSyncStore.getState().syncNow();
    }
  };
  const handleGuestImport = () => {
    try {
      mergeGuestProgress();
      setGuestImportMessage('success');
    } catch {
      setGuestImportMessage('error');
    }
  };

  if (status === 'booting') return <div className="view-enter"><SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.loading')}/><div className="panel account-state"><ChessyIcon name="profile" size={32}/><p>{t('auth.loading')}</p></div></div>;

  if (status === 'unconfigured') return <div className="view-enter"><SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.subtitle')}/><section className="panel account-state account-unconfigured"><ChessyIcon name="shield" size={34}/><div><h2>{t('auth.notConnectedTitle')}</h2><p>{t('auth.notConnectedBody')}</p><p className="fine-print">{t('auth.localStillWorks')}</p></div></section></div>;

  if (status === 'signed-in' && user) return <div className="view-enter">
    <SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.signedInSubtitle')}/>
    <div className="account-grid">
      <section className="panel account-profile"><div className="account-avatar" aria-hidden="true">{user.photoUrl ? <img src={user.photoUrl} alt="" referrerPolicy="no-referrer"/> : <ChessyIcon name="profile" size={34}/>}</div><div><p className="eyebrow">{t('auth.signedInAs')}</p><h2>{user.displayName || user.email || t('auth.player')}</h2>{user.email && <p className="muted">{user.email}</p>}<p className="fine-print">{t('auth.providerLabel')}: {t(`auth.provider.${user.provider}`)}</p></div></section>
      <section className="panel account-actions"><h2>{t('auth.accountActions')}</h2><ProgressSyncStatus compact/><p className="muted">{t('auth.progressLocal')}</p>{guestProgressCanImport(progress) && <div className="account-guest-import"><h3>{t('auth.guestImportTitle')}</h3><p>{t('auth.guestImportBody')}</p><button className="btn secondary" disabled={busy || syncStatus === 'syncing'} onClick={handleGuestImport}>{t('auth.guestImportAction')}</button></div>}{guestImportMessage && <p className={`feedback ${guestImportMessage === 'success' ? 'success' : 'wrong'}`} role="status">{t(`auth.guestImport.${guestImportMessage}`)}</p>}<button className="btn secondary" disabled={busy || syncStatus === 'syncing'} onClick={() => signOut()}>{t('auth.signOut')}</button><div className="account-danger"><h3>{t('auth.deleteTitle')}</h3><p className="fine-print">{t('auth.deleteBody')}</p>{!confirmDelete ? <button className="btn quiet" disabled={busy || syncStatus === 'syncing'} onClick={() => setConfirmDelete(true)}>{t('auth.deleteAccount')}</button> : <div className="button-row"><button className="btn danger" disabled={busy || syncStatus === 'syncing'} onClick={() => void handleDelete()}>{t('auth.confirmDelete')}</button><button className="btn quiet" disabled={busy || syncStatus === 'syncing'} onClick={() => setConfirmDelete(false)}>{t('auth.cancel')}</button></div>}</div></section>
    </div>
    {!user.emailVerified && <section className="panel account-verification"><h2>{t('rooms.verifyTitle')}</h2><p>{t('rooms.verifyBody')}</p><div className="button-row"><button type="button" className="btn secondary" disabled={busy} onClick={async () => { const ok = await sendVerificationEmail(); setVerificationMessage(ok); }}>{t('rooms.resendVerification')}</button><button type="button" className="btn secondary" disabled={busy} onClick={() => void refreshVerification()}>{t('rooms.checkVerification')}</button></div>{verificationMessage && <p className="feedback success" role="status">{t('rooms.verificationSent')}</p>}</section>}
    {invitePending && <button type="button" className="btn primary" onClick={() => { setView('rooms'); window.location.hash='/rooms'; }}>{t('rooms.returnInvite')}</button>}
    {roomsMustBeRemoved && <section className="panel account-room-deletion" role="alert">
      <h2>{t('rooms.deletionBlockedTitle')}</h2><p>{t('rooms.deletionBlockedBody')}</p>
      <button className="btn secondary" type="button" onClick={() => {setView('rooms');window.location.hash='/rooms';}}>{t('rooms.goToRooms')}</button>
    </section>}
    {syncError === 'cloud-delete' && <p className="feedback wrong" role="alert">{t('sync.cloudDeleteError')}</p>}
    {error && <p className="feedback wrong" role="alert">{t(`auth.errors.${error}`)}</p>}{notice && <p className="feedback success" role="status">{t(`auth.notices.${notice}`)}</p>}
  </div>;

  return <div className="view-enter"><SectionHeading eyebrow={t('studio.account')} title={t('auth.title')} subtitle={t('auth.subtitle')}/><div className="account-auth-layout"><section className="panel account-login-card"><div className="segmented account-tabs" aria-label={t('auth.modeLabel')}><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); clearFeedback(); }}>{t('auth.signIn')}</button><button type="button" className={mode === 'create' ? 'active' : ''} onClick={() => { setMode('create'); clearFeedback(); }}>{t('auth.create')}</button></div><form className="account-form" onSubmit={submit}>{mode === 'create' && <><label>{t('rooms.accountType')}<select value={accountKind} onChange={event => setAccountKind(event.target.value as 'adult' | 'guardian' | 'minor')}><option value="adult">{t('rooms.accountAdult')}</option><option value="guardian">{t('rooms.accountGuardian')}</option><option value="minor">{t('rooms.accountMinor')}</option></select></label>{accountKind !== 'adult' && <p className="fine-print" role="status">{t('rooms.accountSafety')}</p>}</>}{mode === 'create' && <label>{t('auth.displayName')}<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80}/></label>}<label>{t('auth.email')}<input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}/></label><label>{t('auth.password')}<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)}/></label><button className="btn primary full" disabled={!canSubmit}>{busy ? t('auth.working') : t(mode === 'signin' ? 'auth.signIn' : 'auth.create')}</button></form><div className="account-divider"><span>{t('auth.or')}</span></div><button className="btn secondary full" disabled={busy} onClick={() => void handleGoogle()}><span className="google-mark" aria-hidden="true">G</span>{t('auth.google')}</button>{mode === 'signin' && <button className="text-button account-reset" disabled={busy || !email.trim()} onClick={() => resetPassword(email.trim())}>{t('auth.resetPassword')}</button>}{error && <p className="feedback wrong" role="alert">{t(`auth.errors.${error}`)}</p>}{notice && <p className="feedback success" role="status">{t(`auth.notices.${notice}`)}</p>}</section><aside className="panel account-local-note"><ChessyIcon name="shield" size={30}/><h2>{t('auth.localFirstTitle')}</h2><p>{t('auth.localFirstBody')}</p><ul><li>{t('auth.localPoint1')}</li><li>{t('auth.localPoint2')}</li><li>{t('auth.localPoint3')}</li></ul></aside></div></div>;
}

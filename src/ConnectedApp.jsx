import { useCallback, useEffect, useMemo, useState } from 'react';
import App from './App.jsx';
import { currentAppVersion } from './appVersion.js';
import { featureFlags } from './config/featureFlags.js';
import { applicationEnvironment } from './config/environment.js';
import { resolveAuthView, sessionRestoreTimeoutMs } from './authGate.js';
import { supabase, supabaseConfiguration } from './lib/supabaseClient.js';
import { isPasskeyCancellation, isPasskeySupported } from './passkeySupport.js';
import { createAuthService } from './services/authService.js';
import { clearUserPhotoCache, migrateLegacyImages, processImageUploads } from './services/imageSyncService.js';
import { createLiveSyncProvider } from './services/liveSyncProvider.js';
import { prepareInitialMigration, verifyAndCompleteMigration } from './services/migrationService.js';
import { clearUserOwnedCompatibilityStorage } from './sync/entityRegistry.js';
import { createIndexedDbStore } from './sync/indexedDbStore.js';
import { createLiveSyncCoordinator } from './sync/liveSyncCoordinator.js';

function StagingDiagnostic({ sessionState }) {
  if (!import.meta.env.DEV) return null;
  return <details className="auth-diagnostic"><summary>Staging diagnostics</summary><dl>
    <div><dt>Supabase configured</dt><dd>{supabaseConfiguration.configured ? 'Yes' : 'No'}</dd></div>
    <div><dt>Session state</dt><dd>{sessionState}</dd></div>
    <div><dt>Environment</dt><dd>Development</dd></div>
    <div><dt>Project host</dt><dd>{supabaseConfiguration.projectHost || 'Unavailable'}</dd></div>
  </dl></details>;
}

function StagingBadge() {
  if (!applicationEnvironment.isStaging) return null;
  return <div className="staging-badge">Staging • {supabaseConfiguration.projectHost || 'configuration required'}</div>;
}

function ConfigurationScreen() {
  return <main className="auth-shell"><section className="auth-card" aria-labelledby="configuration-heading">
    <p className="eyebrow">Plant Tracker {currentAppVersion.version}</p><h1 id="configuration-heading">Supabase configuration required</h1>
    <p role="alert">{supabaseConfiguration.configurationError}</p>
    <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart the development server.</p>
    <StagingDiagnostic sessionState="Signed out" />
  </section></main>;
}

function AuthScreen({ service, initialError = '' }) {
  const [mode, setMode] = useState('signin'); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(initialError);
  const passkeySupported = isPasskeySupported();
  const signInWithPasskey = async () => { setBusy(true); setMessage(''); try { await service.signInWithPasskey(); }
    catch (error) { setMessage(isPasskeyCancellation(error) ? 'Passkey sign-in was cancelled. You can still use your password.' : (error?.message || 'Passkey sign-in is unavailable. Use your password instead.')); }
    finally { setBusy(false); } };
  const submit = async (event) => { event.preventDefault(); setBusy(true); setMessage(''); try {
    if (mode === 'reset') { await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); setMessage('Check your email for a password reset link.'); }
    else if (mode === 'signup') { await service.signUp(email, password); setMessage('Account created. Check your email if confirmation is required.'); }
    else await service.signInWithPassword(email, password);
  } catch (error) { setMessage(error?.message || 'We could not complete that request. Please try again.'); } finally { setBusy(false); } };
  return <main className="auth-shell"><section className="auth-card" aria-labelledby="auth-heading"><p className="eyebrow">Plant Tracker {currentAppVersion.version}</p>
    <h1 id="auth-heading">Plant Tracker</h1><p>Sign in to securely access the same Plant Tracker collection on all your devices.</p>
    {passkeySupported && mode === 'signin' && <><button type="button" className="passkey-signin-button" disabled={busy} onClick={signInWithPasskey}>Sign in with Face ID or passkey</button><div className="auth-divider"><span>or</span></div></>}
    <form onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {mode !== 'reset' && <label>Password<input type="password" minLength="8" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
      <button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button></form>
    {message && <p className="form-error-message" role="alert">{message}</p>} <div className="auth-links"><button type="button" className="text-button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>{mode === 'signup' ? 'Already have an account?' : 'Create an account'}</button>
      <button type="button" className="text-button" onClick={() => setMode(mode === 'reset' ? 'signin' : 'reset')}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button></div><StagingDiagnostic sessionState="Signed out" /></section></main>;
}

function PasskeySettings({ service }) {
  const supported = isPasskeySupported(); const [passkeys, setPasskeys] = useState([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { if (!supported) return; try { setPasskeys(await service.listPasskeys() || []); } catch (error) { setMessage(error?.message || 'Passkeys could not be loaded.'); } }, [service, supported]);
  useEffect(() => { refresh(); }, [refresh]);
  const run = async (action, success) => { setBusy(true); setMessage(''); try { await action(); setMessage(success); await refresh(); } catch (error) { setMessage(isPasskeyCancellation(error) ? 'Passkey setup was cancelled. Your password still works.' : (error?.message || 'That passkey action could not be completed.')); } finally { setBusy(false); } };
  if (!supported) return <section className="passkey-settings" aria-labelledby="passkey-heading"><h4 id="passkey-heading">Face ID and passkeys</h4><p>This browser does not support passkeys. Email and password sign-in remains available.</p></section>;
  return <section className="passkey-settings" aria-labelledby="passkey-heading"><div><h4 id="passkey-heading">Face ID and passkeys</h4><p>Optional, experimental Supabase sign-in using Face ID, Touch ID, a device passcode, or another platform authenticator.</p></div>
    <button type="button" disabled={busy} onClick={() => run(() => service.registerPasskey(), 'Passkey added.')}>Set up Face ID or passkey</button>
    {passkeys.length > 0 && <ul className="passkey-list">{passkeys.map((passkey) => <li key={passkey.id}><span><strong>{passkey.friendly_name || 'Passkey'}</strong><small>{passkey.created_at ? `Added ${new Date(passkey.created_at).toLocaleDateString()}` : ''}</small></span><div>
      <button type="button" className="text-button" disabled={busy} onClick={() => { const name = window.prompt('Passkey name', passkey.friendly_name || 'Passkey'); if (name?.trim()) run(() => service.renamePasskey(passkey.id, name.trim()), 'Passkey renamed.'); }}>Rename</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => { if (window.confirm('Remove this passkey? Password sign-in will remain available.')) run(() => service.removePasskey(passkey.id), 'Passkey removed.'); }}>Remove</button></div></li>)}</ul>}
    {!passkeys.length && <p>No passkeys are registered for this account.</p>}{message && <p role="status">{message}</p>}</section>;
}

function ConflictReview({ coordinator, status }) {
  const [open, setOpen] = useState(false); const [conflicts, setConflicts] = useState([]); const [selected, setSelected] = useState(null); const [manual, setManual] = useState('');
  const refresh = useCallback(async () => setConflicts(coordinator ? await coordinator.getConflicts() : []), [coordinator]);
  useEffect(() => { refresh(); return coordinator?.subscribe(refresh); }, [coordinator, status?.conflicts, refresh]);
  if (!coordinator || !conflicts.length) return null;
  const choose = async (choice) => { await coordinator.resolveConflict(selected.id, choice, manual); setSelected(null); await refresh(); };
  return <><button className="conflict-review-trigger" type="button" onClick={() => setOpen(true)}>{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} need review</button>
    {open && <div className="tracker-modal-backdrop"><section className="tracker-modal conflict-review" role="dialog" aria-modal="true" aria-labelledby="conflict-heading">
      <div className="tracker-modal-heading"><h2 id="conflict-heading">Conflict Review</h2><button type="button" className="secondary-button" onClick={() => { setOpen(false); setSelected(null); }}>Close</button></div>
      {!selected ? <ul className="conflict-list">{conflicts.map((item) => <li key={item.id}><button type="button" onClick={() => { setSelected(item); setManual(String(item.localValue ?? '')); }}><strong>{item.displayLabel}</strong><span>{item.fieldPath || 'Record'} · {new Date(item.remoteTimestamp).toLocaleString()}</span></button></li>)}</ul>
        : <div><button type="button" className="text-button" onClick={() => setSelected(null)}>← All conflicts</button><h3>{selected.displayLabel}</h3><p><strong>Field:</strong> {selected.fieldPath}</p>
          <div className="conflict-values"><section><h4>This device</h4><pre>{typeof selected.localValue === 'object' ? JSON.stringify(selected.localValue, null, 2) : String(selected.localValue ?? 'Not set')}</pre></section><section><h4>Other device</h4><pre>{typeof selected.remoteValue === 'object' ? JSON.stringify(selected.remoteValue, null, 2) : String(selected.remoteValue ?? 'Not set')}</pre></section></div>
          {(typeof selected.localValue === 'string' || typeof selected.remoteValue === 'string') && <label>Manually combine<textarea rows="5" value={manual} onChange={(event) => setManual(event.target.value)} /></label>}
          <div className="form-actions"><button type="button" onClick={() => choose('local')}>Keep this device</button><button type="button" onClick={() => choose('remote')}>Keep other device</button>{(typeof selected.localValue === 'string' || typeof selected.remoteValue === 'string') && <button type="button" onClick={() => choose('manual')}>Use combined value</button>}<button type="button" className="secondary-button" onClick={() => setSelected(null)}>Resolve later</button></div></div>}
    </section></div>}</>;
}

export default function ConnectedApp() {
  const service = useMemo(() => createAuthService({ client: supabase }), []);
  const [session, setSession] = useState(null); const [restoring, setRestoring] = useState(supabaseConfiguration.configured); const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [coordinator, setCoordinator] = useState(null); const [syncStatus, setSyncStatus] = useState(null);
  const [removeOfflineData, setRemoveOfflineData] = useState(null);
  const [migrationReport, setMigrationReport] = useState(null);
  const userId = session?.user?.id || '';
  useEffect(() => { if (!supabase) { setRestoring(false); return undefined; }
    let active = true;
    const timeout = window.setTimeout(() => { if (active) { setAuthError('Session restoration timed out. Please sign in again.'); setRestoring(false); } }, sessionRestoreTimeoutMs);
    supabase.auth.getSession().then(({ data, error }) => { if (!active) return; clearTimeout(timeout); setSession(data?.session || null); setAuthError(error?.message || ''); setRestoring(false); })
      .catch(() => { if (active) { clearTimeout(timeout); setAuthError('We could not restore your session. Please sign in again.'); setRestoring(false); } });
    const subscription = service.onAuthStateChange((_event, nextSession) => { if (!active) return; setSession(nextSession); setAuthError(''); setRestoring(false); if (!nextSession) { clearUserPhotoCache(); setReady(false); clearUserOwnedCompatibilityStorage(); } });
    return () => { active = false; clearTimeout(timeout); subscription.unsubscribe(); }; }, [service]);
  useEffect(() => {
    if (!userId) { setReady(false); return undefined; }
    globalThis.__plantIndexedSyncActive = true;
    let stopped = false; let debounceTimer = 0; const store = createIndexedDbStore(); const provider = createLiveSyncProvider({ client: supabase, userId });
    const active = createLiveSyncCoordinator({ userId, store, provider }); setCoordinator(active);
    const sync = async () => { if (stopped) return; await active.sync(); await processImageUploads(userId); setMigrationReport(await verifyAndCompleteMigration({ userId, store })); };
    setRemoveOfflineData(() => async () => {
      const status = await active.getStatus();
      const warning = status.pendingChanges ? ` This account has ${status.pendingChanges} unsynced change(s), which will be removed from this device.` : '';
      if (!window.confirm(`Remove this account’s offline data from this device? Hosted data will not be deleted.${warning}`)) return;
      await store.removeUser(userId); clearUserOwnedCompatibilityStorage(); await service.signOut();
    });
    (async () => { setMigrationReport(await prepareInitialMigration({ userId, store, provider })); await active.hydrate(); await migrateLegacyImages(userId); if (!stopped) setReady(true); await sync(); })();
    const unsubscribeStatus = active.subscribe(setSyncStatus);
    const unsubscribeRealtime = featureFlags.realtimeEnabled ? provider.subscribe(async (record) => { await active.ingestRemote(record); await active.hydrate(); }, (state) => active.setRealtimeState(state)) : () => {};
    const onSync = () => { clearTimeout(debounceTimer); debounceTimer = window.setTimeout(sync, 400); };
    window.addEventListener('online', onSync); window.addEventListener('focus', onSync); window.addEventListener('plant-collection-change', onSync); window.addEventListener('plant-all-collections-change', onSync);
    const scanner = window.setInterval(() => { if (!document.hidden) active.captureLocalChanges(); }, 5_000); const timer = window.setInterval(sync, 60_000);
    return () => { stopped = true; globalThis.__plantIndexedSyncActive = false; setRemoveOfflineData(null); unsubscribeStatus(); unsubscribeRealtime(); clearInterval(scanner); clearInterval(timer); clearTimeout(debounceTimer); store.close();
      window.removeEventListener('online', onSync); window.removeEventListener('focus', onSync); window.removeEventListener('plant-collection-change', onSync); window.removeEventListener('plant-all-collections-change', onSync); };
  }, [userId, service]);
  const authView = resolveAuthView({ configured: supabaseConfiguration.configured, restoring, session, error: authError });
  if (authView === 'configuration') return <><StagingBadge /><ConfigurationScreen /></>;
  if (authView === 'loading' || (authView === 'application' && !ready)) return <><StagingBadge /><main className="auth-shell"><p role="status">Restoring your secure collection…</p><StagingDiagnostic sessionState="Loading" /></main></>;
  if (authView === 'authentication') return <><StagingBadge /><AuthScreen service={service} initialError={authError} /></>;
  return <><StagingBadge /><App account={session?.user || null} onSignOut={() => service.signOut()} onRemoveOfflineData={removeOfflineData} syncStatusOverride={syncStatus} migrationReport={migrationReport} passkeySettings={<PasskeySettings service={service} />} /><ConflictReview coordinator={coordinator} status={syncStatus} /></>;
}

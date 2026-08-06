import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import App from './App.jsx';
import { currentAppVersion } from './appVersion.js';
import { featureFlags } from './config/featureFlags.js';
import { applicationEnvironment } from './config/environment.js';
import { resolveAuthView, sessionRestoreTimeoutMs } from './authGate.js';
import { supabase, supabaseConfiguration } from './lib/supabaseClient.js';
import { isPasskeyCancellation, isPasskeySupported } from './passkeySupport.js';
import { passkeyActionMessage, passkeyOriginDetails, registerPasskeyAndRefresh } from './passkeyRegistration.js';
import { createAuthService } from './services/authService.js';
import { clearUserPhotoCache, migrateLegacyImages, processImageUploads } from './services/imageSyncService.js';
import { createLiveSyncProvider } from './services/liveSyncProvider.js';
import { prepareInitialMigration, verifyAndCompleteMigration } from './services/migrationService.js';
import { clearUserOwnedCompatibilityStorage } from './sync/entityRegistry.js';
import { createIndexedDbStore } from './sync/indexedDbStore.js';
import { createLiveSyncCoordinator } from './sync/liveSyncCoordinator.js';
import { createStartupRun, openLocalCollection, withStartupTimeout } from './startupPipeline.js';

function StagingDiagnostic({ sessionState, startupStage = '', elapsedMs = 0 }) {
  if (!import.meta.env.DEV) return null;
  return <details className="auth-diagnostic"><summary>Staging diagnostics</summary><dl>
    <div><dt>Supabase configured</dt><dd>{supabaseConfiguration.configured ? 'Yes' : 'No'}</dd></div>
    <div><dt>Session state</dt><dd>{sessionState}</dd></div>
    {startupStage && <><div><dt>Startup stage</dt><dd>{startupStage}</dd></div><div><dt>Elapsed</dt><dd>{elapsedMs}ms</dd></div></>}
    <div><dt>Environment</dt><dd>Development</dd></div>
    <div><dt>Project host</dt><dd>{supabaseConfiguration.projectHost || 'Unavailable'}</dd></div>
  </dl></details>;
}

const safeRealtimeError = (error) => error ? {
  realtimeErrorName: String(error.name || error.cause?.name || 'RealtimeError'),
  realtimeErrorCode: String(error.code || error.cause?.code || ''),
  realtimeErrorMessage: String(error.message || error.cause?.message || error).slice(0, 240),
} : { realtimeErrorName: '', realtimeErrorCode: '', realtimeErrorMessage: '' };

const jwtExpiration = (token) => { try { return new Date(JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))).exp * 1000).toISOString(); } catch { return null; } };

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
  const supported = isPasskeySupported(); const [passkeys, setPasskeys] = useState([]); const [loaded, setLoaded] = useState(false); const [message, setMessage] = useState(null); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { if (!supported) return []; try { const next = await service.listPasskeys() || []; setPasskeys(next); setLoaded(true); return next; } catch (error) { setMessage({ kind: 'error', text: error?.message || 'Passkeys could not be loaded.' }); return []; } }, [service, supported]);
  useEffect(() => { refresh(); }, [refresh]);
  const run = async (action, success) => { setBusy(true); setMessage(null); try { await action(); setMessage({ kind: 'success', text: success }); } catch (error) { setMessage(passkeyActionMessage(error)); } finally { setBusy(false); } };
  const register = () => run(async () => { const next = await registerPasskeyAndRefresh(service); setPasskeys(next); setLoaded(true); }, 'Passkey added.');
  const origin = passkeyOriginDetails();
  if (!supported) return <section className="passkey-settings" aria-labelledby="passkey-heading"><h4 id="passkey-heading">Face ID and passkeys</h4><p>This browser does not support passkeys. Email and password sign-in remains available.</p></section>;
  return <section className="passkey-settings" aria-labelledby="passkey-heading"><div><h4 id="passkey-heading">Face ID and passkeys</h4><p>Optional, experimental Supabase sign-in using Face ID, Touch ID, a device passcode, or another platform authenticator.</p></div>
    <button type="button" disabled={busy} onClick={register}>{busy ? 'Waiting for Face ID or passkey…' : 'Add passkey'}</button>
    {passkeys.length > 0 && <ul className="passkey-list">{passkeys.map((passkey) => <li key={passkey.id}><span><strong>{passkey.friendly_name || 'Passkey'}</strong><small>{passkey.created_at ? `Added ${new Date(passkey.created_at).toLocaleDateString()}` : ''}</small></span><div>
      <button type="button" className="text-button" disabled={busy} onClick={() => { const name = window.prompt('Passkey name', passkey.friendly_name || 'Passkey'); if (name?.trim()) run(() => service.renamePasskey(passkey.id, name.trim()), 'Passkey renamed.'); }}>Rename</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => { if (window.confirm('Remove this passkey? Password sign-in will remain available.')) run(() => service.removePasskey(passkey.id), 'Passkey removed.'); }}>Remove</button></div></li>)}</ul>}
    {loaded && !busy && !passkeys.length && <p>No passkeys are registered for this account.</p>}
    {applicationEnvironment.isStaging && <details className="auth-diagnostic"><summary>Passkey configuration</summary><dl><div><dt>Relying-party ID</dt><dd>{origin.relyingPartyId || 'Unavailable'}</dd></div><div><dt>Allowed origin</dt><dd>{origin.origin || 'Unavailable'}</dd></div></dl><p>These values must exactly match Supabase Authentication → Passkeys for this preview.</p></details>}
    {message && <p className={message.kind === 'error' ? 'form-error-message' : undefined} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}</section>;
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
        : <div><button type="button" className="text-button" onClick={() => setSelected(null)}>← All conflicts</button><h3>{selected.displayLabel}</h3>
          {selected.parentPlantName && <p><strong>Plant:</strong> {selected.parentPlantName}</p>}
          <p><strong>Record:</strong> {selected.recordTypeLabel || selected.entityType}</p><p><strong>Field:</strong> {selected.fieldPath}</p>
          <div className="conflict-values"><section><h4>This device</h4><pre>{typeof selected.localValue === 'object' ? JSON.stringify(selected.localValue, null, 2) : String(selected.localValue ?? 'Not set')}</pre></section><section><h4>Other device</h4><pre>{typeof selected.remoteValue === 'object' ? JSON.stringify(selected.remoteValue, null, 2) : String(selected.remoteValue ?? 'Not set')}</pre></section></div>
          {(typeof selected.localValue === 'string' || typeof selected.remoteValue === 'string') && <label>Manually combine<textarea rows="5" value={manual} onChange={(event) => setManual(event.target.value)} /></label>}
          <div className="form-actions"><button type="button" onClick={() => choose('local')}>Keep this device</button><button type="button" onClick={() => choose('remote')}>Keep other device</button>{(typeof selected.localValue === 'string' || typeof selected.remoteValue === 'string') && <button type="button" onClick={() => choose('manual')}>Use combined value</button>}<button type="button" className="secondary-button" onClick={() => setSelected(null)}>Resolve later</button></div></div>}
    </section></div>}</>;
}

function StartupRecovery({ startup, elapsedMs, onRetry, onContinue, onSignOut }) {
  const timedOut = startup.state === 'error' || elapsedMs >= 10_000;
  return <main className="auth-shell"><section className="auth-card" aria-labelledby="startup-heading">
    <h1 id="startup-heading">Restoring your secure collection…</h1><p role="status">Stage: {startup.stage} · {(elapsedMs / 1000).toFixed(1)}s</p>
    {startup.warning && <p className="form-error-message" role="alert">{startup.warning}</p>}
    {timedOut && <div className="form-actions"><button type="button" onClick={onRetry}>Retry startup</button>{startup.localSafe && <button type="button" className="secondary-button" onClick={onContinue}>Continue with local cached data</button>}<button type="button" className="secondary-button" onClick={onSignOut}>Sign out</button></div>}
    <details className="auth-diagnostic" open={timedOut}><summary>Open diagnostics</summary><dl><div><dt>Current stage</dt><dd>{startup.stage}</dd></div><div><dt>State</dt><dd>{startup.state}</dd></div><div><dt>Elapsed</dt><dd>{elapsedMs}ms</dd></div></dl></details>
  </section></main>;
}

export default function ConnectedApp() {
  const service = useMemo(() => createAuthService({ client: supabase }), []);
  const [session, setSession] = useState(null); const [restoring, setRestoring] = useState(supabaseConfiguration.configured); const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [coordinator, setCoordinator] = useState(null); const [syncStatus, setSyncStatus] = useState(null);
  const [removeOfflineData, setRemoveOfflineData] = useState(null);
  const [migrationReport, setMigrationReport] = useState(null);
  const [runtimeGeneration, setRuntimeGeneration] = useState(0); const [startup, setStartup] = useState({ stage: 'session-restoration', state: 'pending', warning: '', localSafe: false }); const [startupElapsed, setStartupElapsed] = useState(0);
  const runtimeRef = useRef(null);
  const startupRunRef = useRef(0);
  const sessionRef = useRef(session); sessionRef.current = session;
  const userId = session?.user?.id || '';
  const realtimeEnabled = featureFlags.realtimeEnabled || applicationEnvironment.isStaging;
  useEffect(() => { if (!supabase) { setRestoring(false); return undefined; }
    let active = true;
    const startedAt = Date.now(); const progress = window.setInterval(() => { if (active) setStartupElapsed(Date.now() - startedAt); }, 250);
    const timeout = window.setTimeout(() => { if (active) { clearInterval(progress); setAuthError('Session restoration timed out. Please sign in again.'); setRestoring(false); } }, sessionRestoreTimeoutMs);
    supabase.auth.getSession().then(({ data, error }) => { if (!active) return; clearTimeout(timeout); clearInterval(progress); setSession(data?.session || null); setAuthError(error?.message || ''); setRestoring(false); })
      .catch(() => { if (active) { clearTimeout(timeout); clearInterval(progress); setAuthError('We could not restore your session. Please sign in again.'); setRestoring(false); } });
    const subscription = service.onAuthStateChange((event, nextSession) => { if (!active) return; clearInterval(progress); setSession(nextSession); setAuthError(''); setRestoring(false);
      if (event === 'TOKEN_REFRESHED' && nextSession?.access_token) runtimeRef.current?.reconnect?.(nextSession.access_token, 'token-refresh');
      if (!nextSession) { runtimeRef.current?.stop?.(); runtimeRef.current = null; clearUserPhotoCache(); setReady(false); clearUserOwnedCompatibilityStorage(); } });
    return () => { active = false; clearTimeout(timeout); clearInterval(progress); subscription.unsubscribe(); }; }, [service]);
  useEffect(() => {
    if (!userId) { setReady(false); return undefined; }
    const runId = ++startupRunRef.current; const startedAt = Date.now(); const isCurrent = () => startupRunRef.current === runId;
    setReady(false); setStartupElapsed(0); setStartup({ stage: 'indexeddb-open', state: 'pending', warning: '', localSafe: false });
    globalThis.__plantIndexedSyncActive = true;
    let stopped = false; let debounceTimer = 0; let reconnectTimer = 0; let unsubscribeRealtime = null; let reconnectAttempts = 0; let intentionalClose = false;
    const store = createIndexedDbStore(); const provider = createLiveSyncProvider({ client: supabase, userId });
    const active = createLiveSyncCoordinator({ userId, store, provider }); setCoordinator(active);
    const report = (stage, changes = {}) => { if (!isCurrent()) return; const elapsed = Date.now() - startedAt; setStartup((current) => ({ ...current, stage, ...changes })); void active.setDiagnostics({ startupStage: stage, startupState: changes.state || 'pending', startupElapsedMs: elapsed, startupWarning: changes.warning || '' }); };
    const updateRealtime = (state, error, extra = {}) => active.setRealtimeState(state, { ...safeRealtimeError(error), ...extra, online: navigator.onLine !== false, coordinatorRunning: !stopped });
    const connectRealtime = async (token, reason = 'startup') => {
      if (stopped) return;
      if (!realtimeEnabled) { await updateRealtime('disabled', null, { realtimeJwtConfigured: false, lastSubscriptionReason: reason }); return; }
      if (navigator.onLine === false) { await updateRealtime('offline', null, { realtimeJwtConfigured: Boolean(token), realtimeJwtExpiresAt: jwtExpiration(token), lastSubscriptionReason: reason }); return; }
      clearTimeout(reconnectTimer); if (unsubscribeRealtime) { intentionalClose = true; await unsubscribeRealtime(); unsubscribeRealtime = null; intentionalClose = false; }
      try { unsubscribeRealtime = await provider.subscribe(async (record) => { await active.ingestRemote(record); await active.hydrate(); }, (state, error, extra) => {
        const subscribed = state === 'SUBSCRIBED'; if (subscribed) reconnectAttempts = 0;
        updateRealtime(state, error, { ...extra, realtimeJwtConfigured: Boolean(token), realtimeJwtExpiresAt: jwtExpiration(token), lastSubscriptionReason: reason,
          ...(subscribed ? { lastSubscribedAt: new Date().toISOString() } : {}) });
        if (!stopped && !intentionalClose && ['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)) { const delay = Math.min(30_000, 1000 * (2 ** reconnectAttempts++)); reconnectTimer = window.setTimeout(() => connectRealtime(token, `reconnect-${state.toLowerCase()}`), delay); }
      }, token); } catch (error) { updateRealtime('CHANNEL_ERROR', error, { lastSubscriptionReason: reason }); }
    };
    const sync = async () => { if (stopped) return; await active.setDiagnostics({ syncStage: 'validate-session' });
      const { data, error } = await supabase.auth.getSession(); if (error || !data.session?.access_token) { await active.setDiagnostics({ state: 'error', syncStage: 'validate-session', ...safeRealtimeError(error || new Error('SESSION_MISSING')) }); return; }
      void connectRealtime(data.session.access_token, 'sync-now'); await active.setDiagnostics({ syncStage: 'records' }); await active.sync();
      await active.setDiagnostics({ syncStage: 'photos' }); void processImageUploads(userId).then(() => verifyAndCompleteMigration({ userId, store })).then(setMigrationReport).catch((error) => active.setDiagnostics({ imageQueueWarning: String(error?.message || error) })); await active.setDiagnostics({ syncStage: 'complete' }); };
    const runtime = { reconnect: connectRealtime, stop: () => { stopped = true; clearTimeout(reconnectTimer); unsubscribeRealtime?.(); }, sync };
    runtimeRef.current = runtime;
    const restoredToken = sessionRef.current?.access_token || '';
    active.setDiagnostics({ coordinatorRunning: true, realtimeEnabled, realtimeJwtConfigured: Boolean(restoredToken),
      realtimeJwtExpiresAt: jwtExpiration(restoredToken), syncStage: 'starting' });
    setRemoveOfflineData(() => async () => {
      const status = await active.getStatus();
      const warning = status.pendingChanges ? ` This account has ${status.pendingChanges} unsynced change(s), which will be removed from this device.` : '';
      if (!window.confirm(`Remove this account’s offline data from this device? Hosted data will not be deleted.${warning}`)) return;
      await store.removeUser(userId); clearUserOwnedCompatibilityStorage(); await service.signOut();
    });
    const startupClock = window.setInterval(() => { if (isCurrent()) setStartupElapsed(Date.now() - startedAt); }, 250);
    const startupRun = createStartupRun(isCurrent, () => setReady(true));
    (async () => {
      try {
        await openLocalCollection({ store, coordinator: active, report, run: startupRun });
        report('application-ready', { state: 'ready', localSafe: true });
      } catch (error) {
        if (isCurrent()) setStartup({ stage: error?.stage || 'local-hydration', state: 'error', warning: error?.message || 'Local startup failed.', localSafe: Boolean(error?.localSafe) });
        return;
      }
      // Everything below is bounded background work and cannot hold the local UI closed.
      if (restoredToken) void withStartupTimeout(connectRealtime(restoredToken, 'session-restored'), 5_000, 'realtime-startup').catch((error) => report('realtime-retrying', { warning: error.message, localSafe: true }));
      try { report('migration-v5-repair', { localSafe: true }); setMigrationReport(await withStartupTimeout(prepareInitialMigration({ userId, store, provider }), 12_000, 'migration-v5-repair')); }
      catch (error) { report('migration-warning', { state: 'warning', warning: error.message, localSafe: true }); }
      if (stopped || !isCurrent()) return;
      try { report('compatibility-serialization', { localSafe: true }); await withStartupTimeout(active.hydrate(), 8_000, 'compatibility-serialization'); }
      catch (error) { report('serialization-warning', { state: 'warning', warning: error.message, localSafe: true }); }
      report('initial-direct-reconciliation', { localSafe: true });
      void withStartupTimeout(sync(), 15_000, 'initial-direct-reconciliation').catch((error) => report('offline-local-first', { state: 'warning', warning: error.message, localSafe: true }));
      report('image-queue-background', { localSafe: true }); void withStartupTimeout(migrateLegacyImages(userId), 10_000, 'image-queue-initialization').catch((error) => active.setDiagnostics({ imageQueueWarning: error.message }));
    })().catch((error) => { if (isCurrent()) setStartup({ stage: 'startup-runtime', state: 'error', warning: String(error?.message || error), localSafe: startupRun.ready }); });
    const unsubscribeStatus = active.subscribe(setSyncStatus);
    const onSync = (event) => { if (event?.detail?.queueMutation === false) return; clearTimeout(debounceTimer); debounceTimer = window.setTimeout(sync, 400); };
    const onCollectionChange = async (event) => { if (event?.detail?.queueMutation === false || stopped) return; await active.captureLocalChanges({ source: 'user', reason: event?.detail?.reason || 'application-write' }); onSync(event); };
    const onVisibility = () => { if (!document.hidden) onSync(); };
    window.addEventListener('online', onSync); window.addEventListener('focus', onSync); window.addEventListener('plant-sync-now', onSync); window.addEventListener('visibilitychange', onVisibility); window.addEventListener('plant-collection-change', onCollectionChange); window.addEventListener('plant-all-collections-change', onCollectionChange);
    const scanner = window.setInterval(() => { if (!document.hidden) active.captureLocalChanges(); }, 5_000); const timer = window.setInterval(sync, 60_000);
    return () => { stopped = true; const wasCurrent = isCurrent(); if (wasCurrent) startupRunRef.current += 1; if (runtimeRef.current === runtime) runtimeRef.current = null; if (wasCurrent) globalThis.__plantIndexedSyncActive = false; setRemoveOfflineData(null); unsubscribeStatus(); unsubscribeRealtime?.(); clearInterval(scanner); clearInterval(timer); clearInterval(startupClock); clearTimeout(debounceTimer); clearTimeout(reconnectTimer); store.close();
      window.removeEventListener('online', onSync); window.removeEventListener('focus', onSync); window.removeEventListener('plant-sync-now', onSync); window.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('plant-collection-change', onCollectionChange); window.removeEventListener('plant-all-collections-change', onCollectionChange); };
  }, [userId, service, runtimeGeneration, realtimeEnabled]);
  const syncNow = useCallback(async () => {
    if (runtimeRef.current) return runtimeRef.current.sync();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user?.id || !data.session.access_token) { setAuthError(error?.message || 'Your session could not be restored. Please sign in again.'); return; }
    setSession(data.session); setReady(false); setRuntimeGeneration((value) => value + 1);
  }, []);
  const authView = resolveAuthView({ configured: supabaseConfiguration.configured, restoring, session, error: authError });
  if (authView === 'configuration') return <><StagingBadge /><ConfigurationScreen /></>;
  if (authView === 'loading') return <><StagingBadge /><main className="auth-shell"><p role="status">Restoring your secure collection…</p><StagingDiagnostic sessionState="Loading" startupStage="session-restoration" elapsedMs={startupElapsed} /></main></>;
  if (authView === 'application' && !ready) return <><StagingBadge /><StartupRecovery startup={startup} elapsedMs={startupElapsed} onRetry={() => setRuntimeGeneration((value) => value + 1)} onContinue={() => startup.localSafe && setReady(true)} onSignOut={() => service.signOut()} /></>;
  if (authView === 'authentication') return <><StagingBadge /><AuthScreen service={service} initialError={authError} /></>;
  return <><StagingBadge /><App account={session?.user || null} onSignOut={() => service.signOut()} onRemoveOfflineData={removeOfflineData} onSyncNow={syncNow} syncStatusOverride={syncStatus} migrationReport={migrationReport} passkeySettings={<PasskeySettings service={service} />} /><ConflictReview coordinator={coordinator} status={syncStatus} /></>;
}

export class StartupTimeoutError extends Error {
  constructor(stage, timeoutMs) { super(`${stage} timed out after ${timeoutMs}ms.`); this.name = 'StartupTimeoutError'; this.stage = stage; this.timeoutMs = timeoutMs; }
}

export function withStartupTimeout(value, timeoutMs, stage, timers = globalThis) {
  let timer;
  return Promise.race([
    Promise.resolve(value).finally(() => timers.clearTimeout(timer)),
    new Promise((_, reject) => { timer = timers.setTimeout(() => reject(new StartupTimeoutError(stage, timeoutMs)), timeoutMs); }),
  ]);
}

export function createStartupRun(isCurrent, onReady) {
  let ready = false;
  return Object.freeze({
    isCurrent,
    markReady() { if (!ready && isCurrent()) { ready = true; onReady(); return true; } return false; },
    get ready() { return ready; },
  });
}

export async function openLocalCollection({ store, coordinator, timeoutMs = 8_000, report = () => {}, run }) {
  report('indexeddb-open');
  await withStartupTimeout(store.open(), timeoutMs, 'indexeddb-open');
  if (!run.isCurrent()) return { mounted: false, cachedRecords: 0 };
  report('pending-mutation-repair');
  await withStartupTimeout(coordinator.recoverProcessingLeases(), timeoutMs, 'pending-mutation-repair');
  report('user-namespace-hydration');
  const records = await withStartupTimeout(store.forUser('records', coordinator.userId), timeoutMs, 'user-namespace-hydration');
  if (records.length) {
    report('compatibility-serialization');
    try { await withStartupTimeout(coordinator.hydrate(), timeoutMs, 'compatibility-serialization'); }
    catch (error) { error.localSafe = true; throw error; }
  }
  run.markReady();
  report('local-ready');
  return { mounted: run.ready, cachedRecords: records.length };
}

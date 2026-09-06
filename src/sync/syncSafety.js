const infrastructureCodes = new Set(['PGRST000','PGRST001','PGRST002','PGRST003','429','500','502','503','504','520','521','522','523','524']);
export const syncRetryPolicy = Object.freeze({ minimumMs: 5_000, maximumMs: 300_000, circuitThreshold: 3, baseCooldownMs: 60_000, maximumCooldownMs: 900_000 });

export function errorCode(error) { return String(error?.code || error?.cause?.code || error?.status || error?.statusCode || ''); }
export function isInfrastructureFailure(error) { const code = errorCode(error); return infrastructureCodes.has(code) || /^5\d\d$/.test(code) || error?.name === 'TypeError'; }
export function retryDelay(attempt, random = Math.random) {
  const base = Math.min(syncRetryPolicy.maximumMs, syncRetryPolicy.minimumMs * (2 ** Math.min(Math.max(0, attempt - 1), 8)));
  return Math.round(base * (.8 + random() * .4));
}

export function createCircuitBreaker({ now = Date.now } = {}) {
  let state = 'closed'; let failures = 0; let openedAt = 0; let nextRetryAt = 0; let reason = ''; let openings = 0; let probeActive = false;
  const snapshot = () => ({ state, reason, failureCount: failures, openedAt: openedAt ? new Date(openedAt).toISOString() : null,
    nextRetryAt: nextRetryAt ? new Date(nextRetryAt).toISOString() : null });
  return Object.freeze({
    snapshot,
    canRun({ manual = false } = {}) {
      if (state === 'closed') return true;
      if (probeActive) return false;
      if (!manual && now() < nextRetryAt) return false;
      state = 'half-open'; probeActive = true; return true;
    },
    success() { state = 'closed'; failures = 0; openedAt = 0; nextRetryAt = 0; reason = ''; probeActive = false; return snapshot(); },
    failure(error) {
      probeActive = false; failures += 1; reason = errorCode(error) || error?.message || 'infrastructure-failure';
      if (failures >= syncRetryPolicy.circuitThreshold || state === 'half-open') {
        state = 'open'; openings += 1; openedAt = now();
        nextRetryAt = openedAt + Math.min(syncRetryPolicy.maximumCooldownMs, syncRetryPolicy.baseCooldownMs * (2 ** Math.min(openings - 1, 4)));
      }
      return snapshot();
    },
  });
}

export function createSingleFlight({ now = Date.now, id = () => globalThis.crypto?.randomUUID?.() || `sync-${now()}` } = {}) {
  let active = null; let followUp = false; let coalesced = 0; let current = null;
  const diagnostics = () => ({ currentRunId: current?.id || null, currentRunStartedAt: current?.startedAt || null,
    currentRunTrigger: current?.trigger || null, triggerCoalesced: followUp, overlappingAttemptsPrevented: coalesced });
  return Object.freeze({
    diagnostics,
    run(trigger, task) {
      if (active) { followUp = true; coalesced += 1; return active; }
      active = (async () => {
        let nextTrigger = trigger;
        do {
          followUp = false; current = { id: id(), trigger: nextTrigger, startedAt: new Date(now()).toISOString() };
          await task(current);
          nextTrigger = 'coalesced-follow-up';
        } while (followUp);
      })().finally(() => { active = null; current = null; followUp = false; });
      return active;
    },
  });
}

const text = (value, limit = 2000) => value == null ? '' : String(value).slice(0, limit);

export function preserveSyncError(error, context = {}) {
  const original = error?.cause || error;
  const message = text(original?.message || error?.message || original || 'Unknown sync error', 500);
  const diagnostic = {
    occurredAt: new Date().toISOString(),
    entityType: text(context.entityType, 100), entityId: text(context.entityId, 200), mutationId: text(context.mutationId, 200),
    repository: text(context.repository || 'indexeddb/live-sync', 100), providerFunction: text(context.providerFunction || context.stage || 'unknown', 160),
    failureOrigin: text(context.failureOrigin || 'unknown', 100),
    originalName: text(original?.name || error?.name || 'Error', 100), originalCode: text(original?.code || error?.code, 100),
    originalMessage: message, originalDetails: text(original?.details, 500), originalHint: text(original?.hint, 500),
    stackTrace: text(original?.stack || error?.stack || new Error(message).stack),
  };
  console.error('[plant-tracker:mutation-failure]', { ...diagnostic, originalException: original });
  return diagnostic;
}

export function classifySyncFailure(providerFunction = '') {
  if (providerFunction.includes('indexeddb')) return 'IndexedDB';
  if (providerFunction.includes('repository')) return 'repository lookup';
  if (providerFunction.includes('maybeSingle') || providerFunction.includes('getRecord')) return 'repository lookup';
  if (providerFunction.includes('rpc')) return 'Supabase RPC';
  if (providerFunction.includes('serializ')) return 'serialization';
  if (providerFunction.includes('queue')) return 'queue deserialization';
  if (providerFunction.includes('entity-registry')) return 'entity registry';
  return 'provider dispatch';
}

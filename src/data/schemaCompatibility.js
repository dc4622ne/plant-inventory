export const applicationSchemaVersion = 1;
export const supportedBackupSchemaVersion = 4;

export const migrationStatuses = Object.freeze([
  'not_started', 'preflight', 'backup_created', 'importing', 'merging',
  'awaiting_conflict_review', 'completed', 'failed', 'rolled_back',
]);

export function checkSchemaCompatibility(remoteVersion) {
  const parsed = Number(remoteVersion);
  if (!Number.isInteger(parsed) || parsed < 1) return { compatible: false, reason: 'missing_or_invalid' };
  if (parsed !== applicationSchemaVersion) return {
    compatible: false,
    reason: parsed > applicationSchemaVersion ? 'database_newer' : 'database_older',
  };
  return { compatible: true, reason: 'compatible' };
}

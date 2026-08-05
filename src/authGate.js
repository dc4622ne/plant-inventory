export const sessionRestoreTimeoutMs = 10_000;

export function isValidSession(session) {
  return Boolean(
    session
    && typeof session.access_token === 'string'
    && session.access_token.trim()
    && typeof session.user?.id === 'string'
    && session.user.id.trim(),
  );
}

export function resolveAuthView({ configured, restoring, session, error }) {
  if (!configured) return 'configuration';
  if (restoring) return 'loading';
  if (error || !isValidSession(session)) return 'authentication';
  return 'application';
}

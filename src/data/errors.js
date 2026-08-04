export class DataAccessError extends Error {
  constructor({ code = 'DATA_ACCESS_ERROR', message = 'The requested data operation could not be completed.', operation = '', retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = 'DataAccessError';
    this.code = code;
    this.operation = operation;
    this.retryable = retryable;
  }
}

export function normalizeDataError(error, operation = '') {
  if (error instanceof DataAccessError) return error;
  const conflict = error?.code === 'PGRST116' || error?.code === 'PT409';
  return new DataAccessError({
    code: conflict ? 'VERSION_CONFLICT' : 'DATA_ACCESS_ERROR',
    message: conflict
      ? 'This record was changed on another device. Refresh before trying again.'
      : 'The requested data operation could not be completed.',
    operation,
    retryable: !conflict,
    cause: error,
  });
}

export function disabledServiceError(service) {
  return new DataAccessError({
    code: 'FEATURE_DISABLED',
    message: `${service} is not enabled.`,
    operation: service,
  });
}

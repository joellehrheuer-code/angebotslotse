export class ApiError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
export const fail = (status, code) => { throw new ApiError(status, code); };
export const hashableId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

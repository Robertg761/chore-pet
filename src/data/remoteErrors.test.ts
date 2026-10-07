import { describe, expect, it } from 'vitest'
import { classifyError, isPermanentError, isSchemaMismatch } from './remoteErrors'

describe('isPermanentError', () => {
  it('treats refused data as permanent', () => {
    for (const code of ['23503', '23505', '22P02', '42501', '42601', '44000', 'P0001', 'PGRST100', 'PGRST116']) {
      expect(isPermanentError(code), code).toBe(true)
    }
  })

  it('keeps outages, expired sessions and retryable database errors transient', () => {
    for (const code of [undefined, '', 'PGRST000', 'PGRST001', 'PGRST002', 'PGRST003', 'PGRST301', 'PGRST303', '40001', '40P01', '08006', '53300', '57014', '57P01', '57P03', '58030', 'XX000']) {
      expect(isPermanentError(code), String(code)).toBe(false)
    }
  })

  it('treats codes it does not recognise as transient', () => {
    for (const code of ['ECONNRESET', '500', 'PGRST', 'pgrst100', 'FETCH_ERROR']) expect(isPermanentError(code), code).toBe(false)
  })
})

describe('schema mismatches', () => {
  // A newer app talking to a database whose migration hasn't run yet: the row is fine, the server is behind.
  it('are never permanent, so the change waits instead of being set aside', () => {
    for (const code of ['PGRST204', 'PGRST205', 'PGRST200', '42703', '42P01', '42883']) {
      expect(isPermanentError(code), code).toBe(false)
      expect(isSchemaMismatch(code), code).toBe(true)
      expect(classifyError({ code, status: 400 }), code).toBe('schema')
    }
  })
})

describe('classifyError', () => {
  it('sorts refusals, outages and stuck requests', () => {
    expect(classifyError({ code: '23505', status: 409 })).toBe('permanent')
    expect(classifyError({ code: '42501', status: 403 })).toBe('permanent')
    // No answer at all: the network.
    expect(classifyError({ code: undefined, status: 0 })).toBe('outage')
    expect(classifyError({})).toBe('outage')
    // The server or session, not this row.
    for (const status of [500, 502, 503, 401, 408, 429]) expect(classifyError({ status }), String(status)).toBe('outage')
    expect(classifyError({ code: 'PGRST301', status: 401 })).toBe('outage')
    expect(classifyError({ code: '40001', status: 409 })).toBe('outage')
    // Answered, but refused this one request without a code (e.g. a payload too large).
    expect(classifyError({ status: 413 })).toBe('stuck')
    expect(classifyError({ status: 400 })).toBe('stuck')
  })
})

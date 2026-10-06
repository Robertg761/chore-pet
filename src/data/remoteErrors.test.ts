import { describe, expect, it } from 'vitest'
import { isPermanentError } from './remoteErrors'

describe('isPermanentError', () => {
  it('treats refused data as permanent', () => {
    for (const code of ['23503', '23505', '22P02', '42501', '42P01', '44000', 'P0001', 'PGRST100', 'PGRST116', 'PGRST204']) {
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

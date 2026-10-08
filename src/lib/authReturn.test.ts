import { expect, it } from 'vitest'
import { authReturnMessage } from './authReturn'

it('explains a canceled or failed sign-in without echoing provider text', () => {
  expect(authReturnMessage('?error=access_denied', '')).toContain('canceled')
  expect(authReturnMessage('', '#error=server_error&error_description=private-provider-detail')).toBe("Couldn't finish signing in. Please try again.")
  expect(authReturnMessage('?code=one-time-code', '')).toBeNull()
})

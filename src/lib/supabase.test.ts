import { describe, expect, it } from 'vitest'
import { ownModuleUrl, retryUrl } from './supabase'

describe('retrying a failed library download', () => {
  const origin = 'https://chore.example'

  it('only retries the app’s own files: same origin, under the base path', () => {
    expect(ownModuleUrl('https://chore.example/assets/supabase-abc.js', origin, '/')).toBe('https://chore.example/assets/supabase-abc.js')
    expect(ownModuleUrl('https://chore.example/chore-pet/assets/x.mjs?v=1', origin, '/chore-pet/')).toBe('https://chore.example/chore-pet/assets/x.mjs?v=1')
    // Anything an error message could smuggle in is refused.
    expect(ownModuleUrl('https://evil.example/assets/x.js', origin, '/')).toBeNull()
    expect(ownModuleUrl('https://chore.example.evil.example/assets/x.js', origin, '/')).toBeNull()
    expect(ownModuleUrl('http://chore.example/assets/x.js', origin, '/')).toBeNull()
    expect(ownModuleUrl('https://chore.example/other-app/x.js', origin, '/chore-pet/')).toBeNull()
    expect(ownModuleUrl('not a url', origin, '/')).toBeNull()
    expect(ownModuleUrl(null, origin, '/')).toBeNull()
  })

  it('makes the URL new to the browser', () => {
    expect(retryUrl('https://chore.example/assets/x.js', 5)).toBe('https://chore.example/assets/x.js?retry=5')
    expect(retryUrl('https://chore.example/assets/x.js?v=1', 5)).toBe('https://chore.example/assets/x.js?v=1&retry=5')
  })
})

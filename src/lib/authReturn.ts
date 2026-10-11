/** Auth redirects may report cancellation in the query or fragment. Never echo provider details. */
export function authReturnMessage(search: string, hash: string): string | null {
  const query = new URLSearchParams(search)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const error = query.get('error') ?? fragment.get('error')
  if (!error) return null
  return error === 'access_denied'
    ? 'Sign-in was canceled. You can try again.'
    : "Couldn't finish signing in. Please try again."
}

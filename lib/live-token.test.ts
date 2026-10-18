import { describe, expect, it } from 'vitest'
import { signLiveToken } from './live-token'

describe('live token', () => {
  it('firma un token con payload y expiración', () => {
    process.env.LIVE_SESSION_SECRET = 'test-secret'
    const { token, expiresAt } = signLiveToken({
      sid: 'session-1',
      cid: 'client-1',
      slotId: 'dj-1',
      mount: '/dj1',
      transport: 'whip',
    })

    expect(token.split('.')).toHaveLength(2)
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now())
  })
})

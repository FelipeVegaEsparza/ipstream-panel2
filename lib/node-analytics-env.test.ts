import { describe, expect, it } from 'vitest'
import { nodeAnalyticsEnv } from './node-analytics-env'

describe('nodeAnalyticsEnv', () => {
  it('points radio and TV to the node access log', () => {
    expect(nodeAnalyticsEnv()).toMatchObject({
      ANALYTICS_CADDY_CONTAINER: 'ipstream-caddy',
      ANALYTICS_RADIO_LOG: '/data/access.log',
      ANALYTICS_VIDEO_LOG: '/data/access.log',
      ANALYTICS_LOG_TAIL_BYTES: '5000000',
      ANALYTICS_TV_SESSION_GAP_SECONDS: '300',
    })
  })

  it('accepts overrides for the tail and the TV session window', () => {
    expect(
      nodeAnalyticsEnv({ tailBytes: '10000000', sessionGapSeconds: '60' })
    ).toMatchObject({
      ANALYTICS_LOG_TAIL_BYTES: '10000000',
      ANALYTICS_TV_SESSION_GAP_SECONDS: '60',
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state = { optedIn: false }
  const subscription = {
    get optedIn() {
      return state.optedIn
    },
    optIn: vi.fn(async () => {
      state.optedIn = true
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
  return {
    state,
    subscription,
    init: vi.fn(async (_options?: Record<string, unknown>) => {})
  }
})

vi.mock('react-onesignal', () => ({
  default: {
    init: mocks.init,
    User: { PushSubscription: mocks.subscription }
  }
}))

beforeEach(() => {
  vi.resetModules()
  mocks.state.optedIn = false
  mocks.init.mockClear()
  mocks.subscription.optIn.mockClear()
  mocks.subscription.addEventListener.mockClear()
  mocks.subscription.removeEventListener.mockClear()
})

describe('initPush', () => {
  it('no inicializa sin appId', async () => {
    const push = await import('./push')
    expect(await push.initPush(null)).toBe(false)
    expect(mocks.init).not.toHaveBeenCalled()
  })

  it('inicializa con el worker de OneSignal en subcarpeta', async () => {
    const push = await import('./push')
    expect(await push.initPush('app-1', 'safari-1')).toBe(true)
    expect(mocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'app-1',
        serviceWorkerPath: push.ONESIGNAL_WORKER_PATH,
        serviceWorkerParam: { scope: push.ONESIGNAL_WORKER_SCOPE },
        safari_web_id: 'safari-1'
      })
    )
  })

  it('omite safari_web_id cuando no viene', async () => {
    const push = await import('./push')
    await push.initPush('app-1')
    const options = mocks.init.mock.calls[0][0]
    expect(options).not.toHaveProperty('safari_web_id')
  })

  it('no reinicializa para el mismo appId', async () => {
    const push = await import('./push')
    await push.initPush('app-1')
    await push.initPush('app-1')
    expect(mocks.init).toHaveBeenCalledTimes(1)
  })
})

describe('suscripción', () => {
  it('refleja el estado y hace opt-in', async () => {
    const push = await import('./push')
    await push.initPush('app-1')

    expect(push.isPushSubscribed()).toBe(false)
    expect(await push.optInPush()).toBe(true)
    expect(push.isPushSubscribed()).toBe(true)
  })

  it('registra y limpia el listener de cambios', async () => {
    const push = await import('./push')
    await push.initPush('app-1')

    const callback = vi.fn()
    const unsubscribe = push.onPushSubscriptionChange(callback)

    expect(mocks.subscription.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    )

    unsubscribe()
    expect(mocks.subscription.removeEventListener).toHaveBeenCalled()
  })

  it('onPushSubscriptionChange sin inicializar es no-op', async () => {
    const push = await import('./push')
    const unsubscribe = push.onPushSubscriptionChange(vi.fn())
    expect(() => unsubscribe()).not.toThrow()
  })
})

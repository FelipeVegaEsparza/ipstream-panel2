import { describe, expect, it } from 'vitest'
import {
  mapLegacyHost,
  mapWebsiteUrl,
  migrateCasterflyDomains,
} from '../scripts/migrate-casterfly-domains'

function createFakeDb(seed: {
  appConfig?: any[]
  domains?: any[]
  basicData?: any[]
  servers?: any[]
}) {
  const state = JSON.parse(
    JSON.stringify({
      appConfig: seed.appConfig || [],
      domains: seed.domains || [],
      basicData: seed.basicData || [],
      servers: seed.servers || [],
    })
  )

  const db = {
    appConfig: {
      findFirst: async () => state.appConfig[0] ?? null,
      update: async ({ where, data }: any) => {
        const row = state.appConfig.find((r: any) => r.id === where.id)
        Object.assign(row, data)
        return row
      },
      create: async ({ data }: any) => {
        const row = { id: `cfg-${state.appConfig.length + 1}`, ...data }
        state.appConfig.push(row)
        return row
      },
    },
    clientDomain: {
      findMany: async ({ where }: any = {}) =>
        state.domains.filter((d: any) => !where?.kind || d.kind === where.kind),
      findUnique: async ({ where }: any) =>
        state.domains.find((d: any) => d.hostname === where.hostname) ?? null,
      findFirst: async ({ where }: any) =>
        state.domains.find((d: any) =>
          Object.entries(where).every(([key, value]) => d[key] === value)
        ) ?? null,
      create: async ({ data }: any) => {
        const row = { id: `d-${state.domains.length + 1}`, ...data }
        state.domains.push(row)
        return row
      },
      update: async ({ where, data }: any) => {
        const row = state.domains.find((d: any) => d.id === where.id)
        Object.assign(row, data)
        return row
      },
    },
    basicData: {
      findUnique: async ({ where }: any) =>
        state.basicData.find((b: any) => b.clientId === where.clientId) ?? null,
      update: async ({ where, data }: any) => {
        const row = state.basicData.find((b: any) => b.clientId === where.clientId)
        Object.assign(row, data)
        return row
      },
    },
    streamingServer: {
      findMany: async () =>
        state.servers.filter(
          (s: any) =>
            s.publicHostname === 'stream.panelipstream.cl' ||
            s.publicHostname === 'panelipstream.cl' ||
            (s.publicUrl || '').includes('stream.panelipstream.cl')
        ),
      update: async ({ where, data }: any) => {
        const row = state.servers.find((s: any) => s.id === where.id)
        Object.assign(row, data)
        return row
      },
    },
  }

  return { db, state }
}

function seedBase() {
  return {
    appConfig: [
      {
        id: 'cfg1',
        clientSitesDomain: 'ipstream.cl',
        clientSitesTarget: 'clientes.ipstream.cl',
      },
    ],
    domains: [
      {
        id: 'd1',
        clientId: 'c1',
        hostname: 'radio-x.ipstream.cl',
        kind: 'subdomain',
        status: 'active',
        isPrimary: true,
      },
      {
        id: 'd2',
        clientId: 'c1',
        hostname: 'radio-x.com',
        kind: 'custom',
        status: 'active',
        isPrimary: false,
      },
    ],
    basicData: [{ clientId: 'c1', websiteUrl: 'https://radio-x.ipstream.cl' }],
    servers: [
      {
        id: 's1',
        publicHostname: 'stream.panelipstream.cl',
        publicUrl: 'https://stream.panelipstream.cl',
      },
      {
        id: 's2',
        publicHostname: 'nodo1.example.com',
        publicUrl: 'https://nodo1.example.com',
      },
    ],
  }
}

describe('casterfly domain migration', () => {
  it('mapea un subdominio de plataforma y las URLs de sitio', () => {
    expect(mapLegacyHost('radio-x.ipstream.cl')).toBe('radio-x.casterfly.com')
    expect(mapLegacyHost('panelipstream.cl')).toBeNull()
    expect(mapLegacyHost('sub.radio.ipstream.cl')).toBeNull()
    expect(
      mapWebsiteUrl('https://radio-x.ipstream.cl/', 'radio-x.ipstream.cl', 'radio-x.casterfly.com')
    ).toBe('https://radio-x.casterfly.com')
    expect(mapWebsiteUrl('https://radio-x.com', 'radio-x.ipstream.cl', 'radio-x.casterfly.com')).toBeNull()
  })

  it('en dry-run no escribe nada', async () => {
    const { db, state } = createFakeDb(seedBase())
    const before = JSON.stringify(state)
    const summary = await migrateCasterflyDomains(db, { apply: false })
    expect(JSON.stringify(state)).toBe(before)
    expect(summary.domainsCreated).toBe(1)
    expect(summary.appConfigUpdated).toBe(1)
    expect(summary.serversUpdated).toBe(1)
  })

  it('crea el dominio nuevo, deja el viejo como alias y es idempotente', async () => {
    const { db, state } = createFakeDb(seedBase())
    const first = await migrateCasterflyDomains(db, { apply: true })

    expect(first.domainsCreated).toBe(1)
    expect(first.domainsUpdated).toBe(1)
    expect(first.basicDataUpdated).toBe(1)
    expect(first.serversUpdated).toBe(1)
    expect(first.appConfigUpdated).toBe(1)

    const newDomain = state.domains.find(
      (d: any) => d.hostname === 'radio-x.casterfly.com'
    )
    const oldDomain = state.domains.find(
      (d: any) => d.hostname === 'radio-x.ipstream.cl'
    )
    expect(newDomain).toMatchObject({
      clientId: 'c1',
      kind: 'subdomain',
      status: 'active',
      isPrimary: true,
    })
    expect(oldDomain).toMatchObject({ isPrimary: false, status: 'active' })
    expect(state.basicData[0].websiteUrl).toBe('https://radio-x.casterfly.com')
    expect(state.servers[0]).toMatchObject({
      publicHostname: 'stream.casterfly.com',
      publicUrl: 'https://stream.casterfly.com',
    })
    expect(state.servers[1].publicHostname).toBe('nodo1.example.com')

    const second = await migrateCasterflyDomains(db, { apply: true })
    expect(second).toMatchObject({
      appConfigUpdated: 0,
      domainsCreated: 0,
      domainsUpdated: 0,
      basicDataUpdated: 0,
      serversUpdated: 0,
      conflicts: [],
    })
  })

  it('respeta un dominio custom primario', async () => {
    const seed = seedBase()
    seed.domains[1].isPrimary = true
    const { db, state } = createFakeDb(seed)

    await migrateCasterflyDomains(db, { apply: true })

    const newDomain = state.domains.find(
      (d: any) => d.hostname === 'radio-x.casterfly.com'
    )
    const oldDomain = state.domains.find(
      (d: any) => d.hostname === 'radio-x.ipstream.cl'
    )
    expect(newDomain.isPrimary).toBe(false)
    expect(oldDomain.isPrimary).toBe(false)
    expect(state.domains.find((d: any) => d.kind === 'custom').isPrimary).toBe(true)
  })

  it('reporta conflicto si el host nuevo ya pertenece a otro cliente', async () => {
    const seed = seedBase()
    seed.domains.push({
      id: 'd3',
      clientId: 'c2',
      hostname: 'radio-x.casterfly.com',
      kind: 'subdomain',
      status: 'active',
      isPrimary: true,
    })
    const { db, state } = createFakeDb(seed)
    const before = state.domains.length

    const summary = await migrateCasterflyDomains(db, { apply: true })

    expect(summary.conflicts).toHaveLength(1)
    expect(state.domains).toHaveLength(before)
  })
})

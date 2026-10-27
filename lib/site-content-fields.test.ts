import { describe, expect, it } from 'vitest'
import seedData from '@/prisma/seed/site-content.json'
import { SITE_COLLECTIONS, SITE_CONTENT_TABS } from './site-content-fields'

describe('site content admin fields', () => {
  it('todos los campos i18n del editor existen en el snapshot es/en', () => {
    const keys = SITE_CONTENT_TABS.flatMap((tab) => tab.i18nFields.map((field) => field.key))
    const es = seedData.es.i18n as Record<string, string>
    const en = seedData.en.i18n as Record<string, string>

    for (const key of keys) {
      expect(es[key], `falta ${key} en es`).toBeTruthy()
      expect(en[key], `falta ${key} en en`).toBeTruthy()
    }
  })

  it('cada tab declara colecciones válidas y labels', () => {
    for (const tab of SITE_CONTENT_TABS) {
      expect(tab.labelKey).toMatch(/^admin\.siteContent\./)
      for (const key of tab.collectionKeys ?? []) {
        expect(SITE_COLLECTIONS[key]).toBeTruthy()
      }
      for (const field of tab.i18nFields) {
        expect(field.label.length).toBeGreaterThan(0)
      }
    }
  })

  it('los campos de colección apuntan a propiedades editables', () => {
    for (const config of Object.values(SITE_COLLECTIONS)) {
      const sample = config.create()
      for (const field of config.fields) {
        expect(Object.prototype.hasOwnProperty.call(sample, field.path)).toBe(true)
      }
    }
  })
})

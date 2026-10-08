import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

const baked = vi.hoisted(() => ({ name: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientName: () => baked.name
  }
})

function TitleHarness({ title }: { title: string }) {
  useDocumentTitle(title)
  return null
}

afterEach(() => {
  baked.name = null
})

describe('useDocumentTitle', () => {
  it('fija document.title con el nombre del cliente', () => {
    render(<TitleHarness title="Radio Fusion Austral" />)
    expect(document.title).toBe('Radio Fusion Austral')
  })

  it('no modifica el título si no hay nombre ni fallback', () => {
    document.title = 'Título previo'
    render(<TitleHarness title="" />)
    expect(document.title).toBe('Título previo')
  })

  it('usa el nombre del build como fallback cuando no hay projectName', () => {
    baked.name = 'Radio desde build'
    render(<TitleHarness title="" />)
    expect(document.title).toBe('Radio desde build')
  })
})

import { describe, expect, it } from 'vitest'
import { adminMenuName, menuName, sectionName, translateDashboard } from './dashboard-i18n'

describe('dashboard i18n', () => {
  it('traduce el shell al inglés', () => {
    expect(translateDashboard('en', 'dashboard.title')).toBe('Dashboard')
    expect(translateDashboard('en', 'header.logout')).toBe('Sign out')
    expect(translateDashboard('es', 'header.logout')).toBe('Cerrar sesión')
  })

  it('interpola variables', () => {
    expect(
      translateDashboard('en', 'dashboard.firstStepsProgress', { pending: 2, total: 5 })
    ).toBe('You have 2 of 5 steps left to get everything ready.')
  })

  it('traduce menús y secciones', () => {
    expect(menuName('en', 'Primeros pasos')).toBe('Getting started')
    expect(menuName('en', 'Locutor IA')).toBe('AI presenter')
    expect(menuName('en', 'Banner')).toBe('Banner')
    expect(translateDashboard('en', 'banner.title')).toBe('Banner')
    expect(translateDashboard('es', 'banner.title')).toBe('Banner')
    expect(sectionName('en', 'Televisión')).toBe('TV')
    expect(adminMenuName('en', 'Planes y Pagos')).toBe('Plans & payments')
  })
})

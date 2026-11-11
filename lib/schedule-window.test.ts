import { describe, expect, it } from 'vitest'
import { isSlotActive, localTime, minutesUntilSlot } from './schedule-window'

const LOOKAHEAD = 45

describe('localTime', () => {
  it('convierte a la zona del cliente', () => {
    const local = localTime(new Date('2026-11-11T12:00:00Z'), 'America/Punta_Arenas')
    expect(local.minutes).toBe(9 * 60)
  })

  it('cae a UTC con una zona inválida', () => {
    const local = localTime(new Date('2026-11-11T12:00:00Z'), 'No/Existe')
    expect(local.minutes).toBe(12 * 60)
  })
})

describe('minutesUntilSlot', () => {
  const now = new Date('2026-11-11T12:00:00Z')
  const today = now.getUTCDay()
  const tomorrow = (today + 1) % 7

  it('devuelve 0 si la franja está activa', () => {
    expect(
      minutesUntilSlot(
        { dayOfWeek: today, startTime: '11:30', endTime: '13:00' },
        now,
        'UTC',
        LOOKAHEAD
      )
    ).toBe(0)
  })

  it('devuelve los minutos si empieza dentro del lookahead', () => {
    expect(
      minutesUntilSlot(
        { dayOfWeek: today, startTime: '12:30', endTime: '13:00' },
        now,
        'UTC',
        LOOKAHEAD
      )
    ).toBe(30)
  })

  it('devuelve null si todavía falta demasiado', () => {
    expect(
      minutesUntilSlot(
        { dayOfWeek: today, startTime: '14:00', endTime: '15:00' },
        now,
        'UTC',
        LOOKAHEAD
      )
    ).toBeNull()
  })

  it('detecta una franja que empieza justo después de medianoche', () => {
    const late = new Date('2026-11-11T23:50:00Z')
    expect(
      minutesUntilSlot(
        { dayOfWeek: tomorrow, startTime: '00:10', endTime: '01:00' },
        late,
        'UTC',
        LOOKAHEAD
      )
    ).toBe(20)
  })

  it('respeta la zona horaria del cliente', () => {
    // 12:00 UTC = 09:00 en Punta Arenas.
    const localDay = localTime(now, 'America/Punta_Arenas').dayOfWeek
    expect(
      minutesUntilSlot(
        { dayOfWeek: localDay, startTime: '09:20', endTime: '10:00' },
        now,
        'America/Punta_Arenas',
        LOOKAHEAD
      )
    ).toBe(20)
  })
})

describe('isSlotActive', () => {
  it('soporta franjas que cruzan medianoche', () => {
    const local = { dayOfWeek: 3, minutes: 23 * 60 }
    expect(
      isSlotActive(local, { dayOfWeek: 3, startTime: '22:00', endTime: '02:00' })
    ).toBe(true)
    expect(
      isSlotActive({ dayOfWeek: 3, minutes: 12 * 60 }, {
        dayOfWeek: 3,
        startTime: '22:00',
        endTime: '02:00',
      })
    ).toBe(false)
  })
})

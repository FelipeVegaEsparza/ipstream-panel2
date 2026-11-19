import { describe, expect, it } from 'vitest'
import {
  isSlotActive,
  localTime,
  minutesUntilSlot,
  parseDays,
  slotDays,
} from './schedule-window'

const at = (iso: string) => new Date(iso)

function slot(days: string, startTime: string, endTime: string) {
  const first = Number(days.split(',')[0])
  return { dayOfWeek: first, daysOfWeek: days, startTime, endTime }
}

describe('localTime', () => {
  it('resuelve día y minutos en UTC', () => {
    expect(localTime(at('2026-11-18T23:30:00Z'), 'UTC')).toEqual({
      dayOfWeek: 3,
      minutes: 23 * 60 + 30,
    })
  })

  it('convierte a la zona del cliente', () => {
    const local = localTime(at('2026-11-11T12:00:00Z'), 'America/Punta_Arenas')
    expect(local.minutes).toBe(9 * 60)
  })

  it('cae a UTC con una zona inválida', () => {
    const local = localTime(at('2026-11-11T12:00:00Z'), 'No/Existe')
    expect(local.minutes).toBe(12 * 60)
  })
})

describe('parseDays / slotDays', () => {
  it('parsea CSV, deduplica y usa dayOfWeek como fallback', () => {
    expect(parseDays('1,2,3,2', 0)).toEqual([1, 2, 3])
    expect(parseDays(null, 5)).toEqual([5])
    expect(parseDays('', 0)).toEqual([0])
    expect(slotDays({ dayOfWeek: 4, daysOfWeek: '1,4', startTime: '08:00', endTime: '09:00' })).toEqual([1, 4])
  })
})

describe('isSlotActive', () => {
  it('detecta una franja normal del mismo día', () => {
    const s = slot('3', '17:35', '19:00')
    expect(isSlotActive(localTime(at('2026-11-18T18:00:00Z'), 'UTC'), s)).toBe(true)
    expect(isSlotActive(localTime(at('2026-11-18T20:00:00Z'), 'UTC'), s)).toBe(false)
    expect(isSlotActive(localTime(at('2026-11-19T18:00:00Z'), 'UTC'), s)).toBe(false)
  })

  it('detecta la parte posterior a medianoche usando el día anterior', () => {
    const s = slot('3', '17:35', '09:00')
    // Miércoles 18:00 y jueves 08:00 activos; jueves 10:00 y viernes 08:00 no.
    expect(isSlotActive(localTime(at('2026-11-18T18:00:00Z'), 'UTC'), s)).toBe(true)
    expect(isSlotActive(localTime(at('2026-11-19T08:00:00Z'), 'UTC'), s)).toBe(true)
    expect(isSlotActive(localTime(at('2026-11-19T10:00:00Z'), 'UTC'), s)).toBe(false)
    expect(isSlotActive(localTime(at('2026-11-20T08:00:00Z'), 'UTC'), s)).toBe(false)
  })

  it('soporta varios días y cruce de medianoche', () => {
    const s = slot('1,2,3,4,5', '17:35', '09:00')
    // Martes 08:00 viene del lunes; martes 20:00 inicia el martes.
    expect(isSlotActive(localTime(at('2026-11-17T08:00:00Z'), 'UTC'), s)).toBe(true)
    expect(isSlotActive(localTime(at('2026-11-17T20:00:00Z'), 'UTC'), s)).toBe(true)
    // Sábado 08:00 viene del viernes; domingo 08:00 y lunes 08:00 no.
    expect(isSlotActive(localTime(at('2026-11-21T08:00:00Z'), 'UTC'), s)).toBe(true)
    expect(isSlotActive(localTime(at('2026-11-22T08:00:00Z'), 'UTC'), s)).toBe(false)
    expect(isSlotActive(localTime(at('2026-11-16T08:00:00Z'), 'UTC'), s)).toBe(false)
  })

  it('una franja de todos los días cruza sin huecos', () => {
    const s = slot('0,1,2,3,4,5,6', '17:35', '09:00')
    expect(isSlotActive(localTime(at('2026-11-22T08:00:00Z'), 'UTC'), s)).toBe(true)
    expect(isSlotActive(localTime(at('2026-11-22T10:00:00Z'), 'UTC'), s)).toBe(false)
  })
})

describe('minutesUntilSlot', () => {
  it('devuelve 0 si está activa', () => {
    const s = slot('3', '17:35', '19:00')
    expect(minutesUntilSlot(s, at('2026-11-18T18:00:00Z'), 'UTC', 45)).toBe(0)
  })

  it('devuelve los minutos si empieza dentro del lookahead', () => {
    expect(
      minutesUntilSlot(
        { dayOfWeek: 3, startTime: '12:30', endTime: '13:00' },
        at('2026-11-11T12:00:00Z'),
        'UTC',
        45
      )
    ).toBe(30)
  })

  it('detecta una franja que empieza justo después de medianoche', () => {
    expect(
      minutesUntilSlot(
        { dayOfWeek: 4, startTime: '00:10', endTime: '01:00' },
        at('2026-11-11T23:50:00Z'),
        'UTC',
        45
      )
    ).toBe(20)
  })

  it('respeta la zona horaria del cliente', () => {
    // 12:00 UTC = 09:00 en Punta Arenas.
    expect(
      minutesUntilSlot(
        { dayOfWeek: 3, startTime: '09:20', endTime: '10:00' },
        at('2026-11-11T12:00:00Z'),
        'America/Punta_Arenas',
        45
      )
    ).toBe(20)
  })

  it('calcula el próximo inicio de cualquiera de los días', () => {
    const s = slot('1,5', '17:00', '18:00')
    // Miércoles 12:00 → viernes 17:00 (2 días + 5 horas).
    expect(minutesUntilSlot(s, at('2026-11-18T12:00:00Z'), 'UTC', 4000)).toBe(2 * 1440 + 300)
    expect(minutesUntilSlot(s, at('2026-11-18T12:00:00Z'), 'UTC', 45)).toBeNull()
  })
})

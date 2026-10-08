import { useState } from 'react'
import { asArray, normalizeWeekDay } from '@/core/adapters'
import type { Program } from '@/core/types'
import { Card, Grid, Section, SmartImage } from '@/ui'
import type { SectionDataProps } from './format'
import styles from './content.module.css'

const DAYS = [0, 1, 2, 3, 4, 5, 6]
// Orden de exhibición de los días (Lunes a Domingo).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEK_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

function programDays(program: Program): number[] {
  return asArray(program.weekDays).flatMap((day) => {
    if (typeof day === 'number') {
      return Number.isFinite(day) && day >= 0 && day <= 6 ? [Math.round(day)] : []
    }
    const index = WEEK_NAMES.indexOf(String(day).trim().toLowerCase())
    return index >= 0 ? [index] : []
  })
}

function programDayLabels(program: Program): string {
  return [...new Set(programDays(program))]
    .map((day) => normalizeWeekDay(day))
    .join(' · ')
}

interface ProgramsSectionProps extends SectionDataProps {
  variant?: 'list' | 'cards' | 'tabs'
}

/** Card de un programa con todos los datos que expone la API. */
function ProgramCard({ program }: { program: Program }) {
  const days = programDayLabels(program)
  return (
    <Card>
      <SmartImage
        className={styles.programCardMedia}
        src={program.imageUrl}
        alt={program.name}
      />
      <div className={styles.programCardBody}>
        <div className={styles.schedule}>
          <span className={styles.scheduleTime}>
            {program.startTime}–{program.endTime}
          </span>
          {days && <span className={styles.scheduleDays}>{days}</span>}
        </div>
        <h3 className={styles.itemTitle}>{program.name}</h3>
        {program.description && (
          <p className={styles.muted}>{program.description}</p>
        )}
      </div>
    </Card>
  )
}

function ProgramsTabs({ programs }: { programs: Program[] }) {
  const withDays = programs.filter((program) => programDays(program).length > 0)
  const everyDay = programs.filter((program) => programDays(program).length === 0)

  const byDay = new Map<number, Program[]>(
    DAY_ORDER.map((day) => [
      day,
      [
        ...withDays.filter((program) => programDays(program).includes(day)),
        ...everyDay
      ]
    ])
  )

  const today = new Date().getDay()
  const fallbackDay =
    DAY_ORDER.find((day) => (byDay.get(day)?.length ?? 0) > 0) ?? DAY_ORDER[0]
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const resolvedDay =
    activeDay ??
    ((byDay.get(today)?.length ?? 0) > 0 ? today : fallbackDay)
  const dayPrograms = byDay.get(resolvedDay) ?? []

  return (
    <div className={styles.programTabs}>
      <div className={styles.tabsList} role="tablist" aria-label="Días de programación">
        {DAY_ORDER.map((day) => {
          const selected = day === resolvedDay
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
              onClick={() => setActiveDay(day)}
            >
              {normalizeWeekDay(day)}
            </button>
          )
        })}
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {dayPrograms.length === 0 ? (
          <p className={styles.muted}>Sin programación para este día.</p>
        ) : (
          <Grid>
            {dayPrograms.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </Grid>
        )}
      </div>
    </div>
  )
}

export function ProgramsSection({
  clientData,
  isLoading,
  variant = 'list'
}: ProgramsSectionProps) {
  const programs = asArray(clientData?.programs)

  if (variant === 'cards') {
    return (
      <Section title="Programación" visible={programs.length > 0} loading={isLoading}>
        <Grid>
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </Grid>
      </Section>
    )
  }

  if (variant === 'tabs') {
    return (
      <Section title="Programación" visible={programs.length > 0} loading={isLoading}>
        <ProgramsTabs programs={programs} />
      </Section>
    )
  }

  const withDays = programs.filter((program) => programDays(program).length > 0)
  const noDays = programs.filter((program) => programDays(program).length === 0)

  const byDay = DAYS.map((dayIndex) => {
    const items = withDays.filter((program) => programDays(program).includes(dayIndex))
    return { dayIndex, items }
  }).filter((group) => group.items.length > 0)

  const orphan = noDays.length > 0

  return (
    <Section title="Programación" visible={programs.length > 0} loading={isLoading}>
      {byDay.map((group) => (
        <div key={group.dayIndex}>
          <h3 className={styles.day}>{normalizeWeekDay(group.dayIndex)}</h3>
          {group.items.map((program) => (
            <div key={program.id} className={styles.programRow}>
              <span className={styles.programTime}>
                {program.startTime}–{program.endTime}
              </span>
              <span className={styles.programName}>{program.name}</span>
              <span className={styles.programDesc}>{program.description}</span>
            </div>
          ))}
        </div>
      ))}

      {orphan &&
        noDays.map((program) => (
          <div key={program.id} className={styles.programRow}>
            <span className={styles.programTime}>
              {program.startTime}–{program.endTime}
            </span>
            <span className={styles.programName}>{program.name}</span>
            <span className={styles.programDesc}>{program.description}</span>
          </div>
        ))}
    </Section>
  )
}

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const DAY_LABELS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function CalendarView({ events }: { events: any[] }) {
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(toDateKey(new Date()))

  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const ev of events) {
      const key = ev.date
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [events])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(new Date())

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1))
  }

  const selectedEvents = eventsByDate[selectedDay] || []

  return (
    <div className="grid sm:grid-cols-[1.4fr_1fr] gap-4">
      <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <span className="font-bold text-slate-900">{MONTH_NAMES[month]} {year}</span>
          <div className="flex gap-1">
            <button onClick={() => changeMonth(-1)} className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">‹</button>
            <button onClick={() => changeMonth(1)} className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">›</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-[9px] text-slate-400 font-bold pb-1">{d}</div>
          ))}

          {cells.map((date, i) => {
            if (!date) return <div key={'empty-' + i}></div>
            const key = toDateKey(date)
            const hasEvents = !!eventsByDate[key]
            const isToday = key === todayKey
            const isSelected = key === selectedDay

            let cellClass = 'aspect-square rounded-lg text-xs flex items-center justify-center relative cursor-pointer transition '
            if (isToday) cellClass += 'bg-slate-900 text-white font-bold '
            else if (hasEvents) cellClass += 'bg-amber-100 text-amber-800 font-bold hover:bg-amber-200 '
            else cellClass += 'bg-slate-50 text-slate-600 hover:bg-slate-100 '
            if (isSelected && !isToday) cellClass += 'ring-2 ring-amber-400 '

            return (
              <div key={key} className={cellClass} onClick={() => setSelectedDay(key)}>
                {date.getDate()}
                {hasEvents && !isToday && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-red-500"></span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
        <div className="font-bold text-slate-900 text-sm mb-3">
          أحداث يوم {new Date(selectedDay + 'T00:00:00').toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>

        {selectedEvents.length === 0 && (
          <p className="text-slate-400 text-xs">لا توجد أحداث بهذا اليوم.</p>
        )}

        <div className="space-y-2">
          {selectedEvents.map((ev, i) => (
            <Link
              key={i}
              href={'/lawyer/cases/' + ev.caseId}
              className={
                'flex items-center gap-2 p-2.5 rounded-lg text-xs hover:opacity-80 transition ' +
                (ev.type === 'deadline' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')
              }
            >
              <span>{ev.type === 'deadline' ? '⏰' : '📅'}</span>
              <span className="font-bold">{ev.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

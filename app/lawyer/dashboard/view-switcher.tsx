'use client'

import { useState } from 'react'
import CalendarView from './calendar-view'

export default function ViewSwitcher({ casesContent, calendarEvents }: { casesContent: React.ReactNode; calendarEvents: any[] }) {
  const [view, setView] = useState<'cases' | 'calendar'>('cases')

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b border-slate-200">
        <button
          onClick={() => setView('cases')}
          className={
            view === 'cases'
              ? 'px-5 py-3 text-sm font-bold border-b-2 border-emerald-600 text-emerald-700'
              : 'px-5 py-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700'
          }
        >
          قضاياي
        </button>
        <button
          onClick={() => setView('calendar')}
          className={
            view === 'calendar'
              ? 'px-5 py-3 text-sm font-bold border-b-2 border-emerald-600 text-emerald-700'
              : 'px-5 py-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-700'
          }
        >
          📅 التقويم
        </button>
      </div>

      {view === 'cases' && casesContent}
      {view === 'calendar' && <CalendarView events={calendarEvents} />}
    </div>
  )
}

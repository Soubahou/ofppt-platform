import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { academicApi } from '../api/academic.api'

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

const getMonday = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDate = (d) => {
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseWeekSessions = (scheduleData) => {
  if (!scheduleData?.week) return []
  return DAY_KEYS.flatMap((dayKey, dayIdx) =>
    (scheduleData.week[dayKey]?.slots ?? []).map(slot => ({
      ...slot,
      day_of_week:  dayIdx,
      module_id:    slot.module?.id,
      module_name:  slot.module?.name  ?? '—',
      module_code:  slot.module?.type  ?? '',
      teacher_name: slot.teacher?.specialization ?? '',
      room:         slot.instance?.override_room?.name ?? slot.room?.name ?? '',
    }))
  )
}

export function useSchedule({ groupId, userId } = {}) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  const prevWeek  = useCallback(() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }), [])
  const nextWeek  = useCallback(() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }), [])
  const goToToday = useCallback(() => setWeekStart(getMonday(new Date())), [])

  const params = {
    date: formatDate(weekStart),
    ...(groupId ? { group_id: groupId } : {}),
    ...(userId  ? { user_id:  userId  } : {}),
  }

  const { data, isLoading, error } = useQuery({
    queryKey:  ['schedule-week', params],
    queryFn:   () => academicApi.getWeekSchedule(params),
    enabled:   !!(groupId || userId),
    staleTime: 30_000,
  })

  return {
    weekStart,
    prevWeek,
    nextWeek,
    goToToday,
    data,
    sessions:  parseWeekSessions(data),
    isLoading,
    error,
  }
}

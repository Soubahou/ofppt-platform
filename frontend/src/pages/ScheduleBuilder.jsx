import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '../components/layout/AppShell'
import Modal from '../components/ui/Modal'
import { Badge } from '../components/ui/index.jsx'
import { EmptyState } from '../components/shared/index.jsx'
import { SLOTS, DAYS, ROW_HEIGHT } from '../constants/schedule'
import { academicApi } from '../api/academic.api'
import { scheduleApi } from '../api/schedule.api'
import { usersApi }    from '../api/users.api'
import toast from 'react-hot-toast'

const MODULE_COLORS = [
  'bg-blue-100   border-blue-300   text-blue-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-green-100  border-green-300  text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-red-100    border-red-300    text-red-800',
  'bg-teal-100   border-teal-300   text-teal-800',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const getMonday = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}
const fmt = (d) => d.toISOString().split('T')[0]
const weekLabel = (monday) => {
  const end = new Date(monday)
  end.setDate(end.getDate() + 4)
  return `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PlacedSession({ session, colorClass, onDragStart, onUnplace }) {
  const slots = session.slot_count ?? 1
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, session)}
      className={`relative p-1.5 rounded-lg border-2 text-[10px] font-medium h-full overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none group ${colorClass}`}
    >
      <p className="font-bold truncate leading-tight">
        {session.module_teacher_group?.module_teacher?.module?.name ?? 'Module'}
      </p>
      <p className="text-[9px] opacity-70 truncate">
        {session.module_teacher_group?.group?.name}
      </p>
      {session.room && (
        <p className="text-[9px] opacity-60 truncate">🏫 {session.room.name}</p>
      )}
      <p className="text-[9px] opacity-50 mt-0.5">
        {slots === 1 ? '2h30' : '5h'}
      </p>
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onUnplace(session.id) }}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-[10px] font-bold leading-none"
      >✕</button>
    </div>
  )
}

function UnscheduledCard({ session, colorClass, onDragStart, teacherName }) {
  const name  = session.module_teacher_group?.module_teacher?.module?.name ?? 'Module'
  const group = session.module_teacher_group?.group?.name ?? '—'
  const slots = session.slot_count ?? 1
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, session)}
      className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-sm hover:-translate-y-0.5 active:scale-95 select-none ${colorClass}`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-center leading-tight">
        {slots === 1 ? '2h30' : '5h'}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-xs truncate">{name}</p>
        <p className="text-[10px] opacity-70 truncate">{teacherName} · G {group}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ScheduleBuilder() {
  const qc = useQueryClient()

  const [groupId,    setGroupId]  = useState('')
  const [dragged,    setDragged]  = useState(null)
  const [over,       setOver]     = useState(null)
  const [showCreate, setCreate]   = useState(false)

  // Week state — for "apply to week" feature
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const prevWeek  = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek  = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToToday = () => setWeekStart(getMonday(new Date()))

  const [form, setForm] = useState({
    module_teacher_group_id: '',
    slot_count: 1,    // 1 = 2h30, 2 = 5h
    is_online:  false,
    room_id:    '',
  })

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: groupsData  } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => academicApi.listGroups({ limit: 100 }),
  })
  const { data: roomsData   } = useQuery({
    queryKey: ['rooms'],
    queryFn:  () => academicApi.listRooms(),
  })
  const { data: mtgData     } = useQuery({
    queryKey: ['mtg', groupId],
    queryFn:  () => academicApi.listMTG({ group_id: groupId, limit: 100 }),
    enabled:  !!groupId,
  })
  const { data: scheduledData } = useQuery({
    queryKey: ['sessions', 'scheduled', groupId],
    queryFn:  () => scheduleApi.getSessions({ group_id: groupId, scheduled: 'true', limit: 100 }),
    enabled:  !!groupId,
  })
  const { data: unscheduledData } = useQuery({
    queryKey: ['sessions', 'unscheduled', groupId],
    queryFn:  () => scheduleApi.getSessions({ group_id: groupId, scheduled: 'false', limit: 100 }),
    enabled:  !!groupId,
  })
  const { data: formateurData } = useQuery({
    queryKey: ['users', { role: 'formateur' }],
    queryFn:  () => usersApi.list({ role: 'formateur', limit: 100 }),
  })

  // ── Derived data ─────────────────────────────────────────────────────────────
  const scheduled   = scheduledData?.data   ?? []
  const unscheduled = unscheduledData?.data  ?? []
  const mtgs        = mtgData?.data          ?? []
  const rooms       = roomsData?.data        ?? []
  const groups      = groupsData?.data       ?? []

  const userMap = Object.fromEntries(
    (formateurData?.data ?? []).map(u => [u.id, `${u.first_name} ${u.last_name}`])
  )
  const teacherName = (session) => {
    const uid = session.module_teacher_group?.module_teacher?.teacher?.user_id
    return uid ? (userMap[uid] ?? `Formateur #${uid}`) : '—'
  }

  // Build occupation grid
  const grid = {}
  scheduled.forEach(s => {
    if (s.day_of_week != null && s.start_slot != null) {
      for (let i = 0; i < (s.slot_count ?? 1); i++) {
        grid[`${s.day_of_week}-${s.start_slot + i}`] = i === 0 ? s : 'span'
      }
    }
  })

  const moduleColors = {}
  let ci = 0
  ;[...scheduled, ...unscheduled].forEach(s => {
    const mid = s.module_teacher_group?.module_teacher?.module_id
    if (mid != null && !(mid in moduleColors)) moduleColors[mid] = ci++
  })
  const colorFor = (s) =>
    MODULE_COLORS[(moduleColors[s.module_teacher_group?.module_teacher?.module_id] ?? 0) % MODULE_COLORS.length]

  const occupiedRoomIds = new Set(scheduled.filter(s => s.room_id).map(s => s.room_id))

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createSession = useMutation({
    mutationFn: () => scheduleApi.createSession({
      module_teacher_group_id: Number(form.module_teacher_group_id),
      slot_count:              Number(form.slot_count),
      is_online:               form.is_online,
      room_id:                 form.room_id ? Number(form.room_id) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Séance créée')
      setCreate(false)
      setForm({ module_teacher_group_id: '', slot_count: 1, is_online: false, room_id: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur lors de la création'),
  })

  const placeMutation = useMutation({
    mutationFn: ({ id, day_of_week, start_slot }) =>
      scheduleApi.placeSession(id, { day_of_week, start_slot }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Séance placée')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? err.message ?? 'Impossible de placer la séance'),
  })

  const unplaceMutation = useMutation({
    mutationFn: (id) => scheduleApi.unplaceSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Séance retirée de la grille')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  // Apply the current template to a specific week
  const applyWeekMutation = useMutation({
    mutationFn: () => scheduleApi.generateWeekInstances({
      group_id:        Number(groupId),
      week_start_date: fmt(weekStart),
    }),
    onSuccess: (data) => {
      toast.success(
        `Planning appliqué : ${data.instances_created} séance(s) créée(s) pour la semaine du ${weekLabel(weekStart)}`
        + (data.instances_skipped > 0 ? ` (${data.instances_skipped} déjà existante(s))` : '')
      )
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur lors de l\'application'),
  })

  // ── Drag & drop ───────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e, session) => {
    setDragged(session)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDrop = useCallback((e, dayIdx, slotIdx) => {
    e.preventDefault()
    setOver(null)
    if (!dragged) return
    placeMutation.mutate({ id: dragged.id, day_of_week: dayIdx, start_slot: slotIdx })
    setDragged(null)
  }, [dragged, placeMutation])

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-full">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Planning</span><span>/</span>
              <span className="text-slate-700">Constructeur EDT</span>
            </nav>
            <h1 className="page-title">Constructeur d'Emploi du Temps</h1>
            <p className="page-subtitle">
              Faites glisser les séances sur la grille, puis appliquez le planning à une semaine.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <select
              className="select w-52"
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
            >
              <option value="">— Choisir un groupe —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {groupId && (
              <button onClick={() => setCreate(true)} className="btn-primary whitespace-nowrap">
                + Nouvelle Séance
              </button>
            )}
          </div>
        </div>

        {!groupId ? (
          <EmptyState
            icon="🔧"
            title="Sélectionnez un groupe"
            description="Choisissez un groupe dans la liste pour commencer à construire son emploi du temps."
          />
        ) : (
          <div className="flex gap-5 items-start">

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <div className="w-56 flex-shrink-0 space-y-3">

              {/* Apply to week panel */}
              <div className="card p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Appliquer à une semaine</p>

                {/* Week navigator */}
                <div className="flex items-center gap-1">
                  <button onClick={prevWeek}  className="btn-secondary text-[10px] px-2 py-1">←</button>
                  <button onClick={goToToday} className="btn-secondary text-[10px] px-2 py-1 flex-1 truncate">Auj.</button>
                  <button onClick={nextWeek}  className="btn-secondary text-[10px] px-2 py-1">→</button>
                </div>

                <p className="text-[11px] text-slate-600 font-medium text-center px-1 leading-tight">
                  {weekLabel(weekStart)}
                </p>

                <button
                  onClick={() => applyWeekMutation.mutate()}
                  disabled={scheduled.length === 0 || applyWeekMutation.isPending}
                  className="btn-primary w-full justify-center text-xs py-2"
                >
                  {applyWeekMutation.isPending ? 'Application...' : '✓ Appliquer ce planning'}
                </button>

                {scheduled.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    Placez des séances sur la grille d'abord.
                  </p>
                )}
              </div>

              {/* Unscheduled sessions */}
              <div className="card p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2 px-1">
                  Séances à placer
                  <Badge variant="yellow" className="ml-2">{unscheduled.length}</Badge>
                </p>
                {unscheduled.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Toutes les séances sont placées
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {unscheduled.map(s => (
                      <UnscheduledCard
                        key={s.id}
                        session={s}
                        colorClass={colorFor(s)}
                        onDragStart={onDragStart}
                        teacherName={teacherName(s)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {mtgs.length === 0 && (
                <div className="card p-3 border-amber-200 bg-amber-50">
                  <p className="text-xs text-amber-700 font-medium mb-1">⚠️ Aucun module configuré</p>
                  <p className="text-[11px] text-amber-600">
                    Dans <strong>Modules</strong>, ouvrez un module et assignez-le à ce groupe via "Assigner à une filière".
                  </p>
                </div>
              )}
            </div>

            {/* ── Grid (CSS grid — sessions span multiple rows) ─────────── */}
            <div className="flex-1 min-w-0 card p-4 overflow-x-auto">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px repeat(5, 1fr)',
                  gridTemplateRows: `38px repeat(${SLOTS.length}, ${ROW_HEIGHT}px)`,
                  minWidth: 620,
                }}
              >
                {/* Corner */}
                <div
                  style={{ gridColumn: 1, gridRow: 1 }}
                  className="bg-slate-50 border border-slate-200 rounded-tl-lg"
                />

                {/* Day headers */}
                {DAYS.map((d, di) => (
                  <div
                    key={d}
                    style={{ gridColumn: di + 2, gridRow: 1 }}
                    className="flex items-center justify-center text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200"
                  >
                    {d}
                  </div>
                ))}

                {/* Time labels */}
                {SLOTS.map((slot, si) => (
                  <div
                    key={si}
                    style={{ gridColumn: 1, gridRow: si + 2 }}
                    className="flex items-center justify-center border border-slate-200 bg-slate-50 px-1"
                  >
                    <p className="text-[9px] text-slate-500 font-medium text-center whitespace-pre-line leading-tight">
                      {slot.label}
                    </p>
                  </div>
                ))}

                {/* Background drop-zone cells */}
                {SLOTS.map((_, si) =>
                  DAYS.map((_, di) => {
                    const key      = `${di}-${si}`
                    const occupied = !!grid[key]
                    const isOver   = over === key
                    return (
                      <div
                        key={key}
                        style={{ gridColumn: di + 2, gridRow: si + 2 }}
                        className={`border border-slate-200/80 transition-all duration-100 ${
                          isOver   ? 'bg-brand-blue/5 border-brand-blue border-dashed' :
                          occupied ? 'bg-transparent' :
                                     'bg-white hover:bg-slate-50/60'
                        }`}
                        onDragOver={e => { if (!occupied) { e.preventDefault(); setOver(key) } }}
                        onDragLeave={() => setOver(null)}
                        onDrop={e => { if (!occupied) onDrop(e, di, si) }}
                      />
                    )
                  })
                )}

                {/* Placed sessions — span N rows via CSS grid */}
                {scheduled.map(s => {
                  if (s.day_of_week == null || s.start_slot == null) return null
                  return (
                    <div
                      key={s.id}
                      style={{
                        gridColumn: s.day_of_week + 2,
                        gridRow:    `${s.start_slot + 2} / span ${s.slot_count ?? 1}`,
                        zIndex:     10,
                        padding:    '2px',
                      }}
                    >
                      <PlacedSession
                        session={s}
                        colorClass={colorFor(s)}
                        onDragStart={onDragStart}
                        onUnplace={id => unplaceMutation.mutate(id)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create session modal ───────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setCreate(false)} title="Créer une nouvelle séance">
        <div className="space-y-4">
          {mtgs.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
              <p className="text-amber-700 font-medium">⚠️ Aucun module configuré pour ce groupe</p>
              <p className="text-sm text-amber-600">
                Allez dans <strong>Modules</strong> → ouvrez un module → "Assigner à une filière".
              </p>
              <button onClick={() => setCreate(false)} className="btn-secondary text-sm">Fermer</button>
            </div>
          ) : (
            <>
              {/* Module / Teacher select */}
              <div>
                <label className="label">Module / Formateur</label>
                <select
                  className="select"
                  value={form.module_teacher_group_id}
                  onChange={e => setForm(f => ({ ...f, module_teacher_group_id: e.target.value }))}
                >
                  <option value="">— Sélectionner —</option>
                  {mtgs.map(m => {
                    const uid  = m.module_teacher?.teacher?.user_id
                    const name = uid ? (userMap[uid] ?? `Formateur #${uid}`) : 'Non assigné'
                    return (
                      <option key={m.id} value={m.id}>
                        {m.module_teacher?.module?.name ?? 'Module'} — {name}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duration — only 2h30 or 5h */}
                <div>
                  <label className="label">Durée</label>
                  <select
                    className="select"
                    value={form.slot_count}
                    onChange={e => setForm(f => ({ ...f, slot_count: Number(e.target.value) }))}
                  >
                    <option value={1}>Demi-journée — 2h30</option>
                    <option value={2}>Journée complète — 5h</option>
                  </select>
                </div>

                {/* Room */}
                <div>
                  <label className="label">Salle (optionnel)</label>
                  <select
                    className="select"
                    value={form.room_id}
                    onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))}
                  >
                    <option value="">— Aucune salle —</option>
                    {rooms.map(r => {
                      const busy = occupiedRoomIds.has(r.id)
                      return (
                        <option key={r.id} value={r.id}>
                          {r.name}{busy ? ' (occupée)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="is_online"
                  checked={form.is_online}
                  onChange={e => setForm(f => ({ ...f, is_online: e.target.checked }))}
                  className="w-4 h-4 rounded accent-brand-blue"
                />
                <label htmlFor="is_online" className="text-sm text-slate-700 cursor-pointer">
                  Séance en ligne (distanciel)
                </label>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => createSession.mutate()}
                  disabled={!form.module_teacher_group_id || createSession.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {createSession.isPending ? 'Création...' : 'Créer la séance'}
                </button>
                <button onClick={() => setCreate(false)} className="btn-secondary">
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AppShell>
  )
}
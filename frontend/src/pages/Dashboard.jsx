import { useQuery } from '@tanstack/react-query'
import { Link }     from 'react-router-dom'
import { useAuth }  from '../hooks/useAuth'
import AppShell          from '../components/layout/AppShell'
import { SkeletonCard }  from '../components/shared/index.jsx'
import { Badge }         from '../components/ui/index.jsx'
import { academicApi }   from '../api/academic.api'

function StatCard({ label, value, sub, icon, color, to }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  const textColor = {
    blue: 'text-brand-blue', green: 'text-green-600',
    yellow: 'text-yellow-600', red: 'text-red-600', purple: 'text-purple-600',
  }
  const content = (
    <>
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${textColor[color] ?? textColor.blue}`}>{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${colors[color] ?? colors.blue} flex-shrink-0`}>
        {icon}
      </div>
    </>
  )
  if (to) return <Link to={to} className="stat-card-link group">{content}</Link>
  return <div className="stat-card relative">{content}</div>
}

// ── Direction ─────────────────────────────────────────────────────────────────
function DirectionDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  academicApi.getDashboardStats,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const s = stats ?? {}

  return (
    <div className="fade-in space-y-6">
      {/* Stats — real values only, 0 when empty */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard to="/branches"   label="Stagiaires"    value={s.students        ?? 0} sub="Inscrits actifs"     icon="🎓" color="blue"   />
        <StatCard to="/users"      label="Formateurs"    value={s.teachers        ?? 0} sub="Enseignants"         icon="👨‍🏫" color="green"  />
        <StatCard to="/branches"   label="Groupes"       value={s.groups          ?? 0} sub="En session"          icon="🏛" color="yellow" />
        <StatCard to="/schedule"   label="Cours / Jour"  value={s.sessions        ?? 0} sub="Séances programmées" icon="📅" color="purple" />
        <StatCard to="/absences"   label="Absences Inc." value={s.pendingAbsences ?? 0} sub="En attente"          icon="⏰" color="red"    />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent absences — real data, empty state when none */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Absences Récentes</h3>
            <Link to="/absences" className="text-xs text-brand-blue hover:underline font-medium">Voir tout →</Link>
          </div>
          {(s.recentAbsences ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune absence récente</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header text-left rounded-l-lg">Stagiaire</th>
                    <th className="table-header text-left">Groupe</th>
                    <th className="table-header text-left rounded-r-lg">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentAbsences.map((a, i) => (
                    <tr key={i} className="table-row-hover">
                      <td className="table-cell font-medium">{a.name}</td>
                      <td className="table-cell">{a.group}</td>
                      <td className="table-cell">
                        {a.status === 'approved' && <Badge variant="green">Justifié</Badge>}
                        {a.status === 'pending'  && <Badge variant="yellow">En attente</Badge>}
                        {a.status === 'rejected' && <Badge variant="red">Non justifié</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions — these are navigation links, always shown, no fake data */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/users/new',        icon: '➕', label: 'Nouveau compte',    bg: 'bg-blue-50   hover:bg-blue-100'   },
              { to: '/schedule/builder', icon: '🔧', label: 'Constructeur EDT',  bg: 'bg-orange-50 hover:bg-orange-100' },
              { to: '/branches',         icon: '🏛', label: 'Gérer les groupes', bg: 'bg-green-50  hover:bg-green-100'  },
              { to: '/modules',          icon: '📚', label: 'Gérer les modules', bg: 'bg-purple-50 hover:bg-purple-100' },
            ].map(a => (
              <Link key={a.to} to={a.to}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 transition-all text-sm font-medium text-slate-700 active:scale-95 ${a.bg}`}>
                <span className="text-xl">{a.icon}</span>{a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Rooms — real data, empty state when none */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Occupation des Salles (Aujourd'hui)</h3>
          {(s.rooms ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune donnée de salle disponible</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {s.rooms.map((r, i) => (
                <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border-l-4 ${r.busy ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-300'}`}>
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">{r.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.info}</p>
                  </div>
                  <Badge variant={r.busy ? 'green' : 'gray'}>{r.busy ? 'Occupé' : 'Libre'}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Formateur ─────────────────────────────────────────────────────────────────
function FormateurDashboard() {
  const { user } = useAuth()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn:  academicApi.getDashboardStats,
  })

  const today = new Date().toISOString().split('T')[0]
  const { data: weekData, isLoading: weekLoading } = useQuery({
    queryKey: ['schedule', 'week', today, user?.id],
    queryFn:  () => academicApi.getWeekSchedule({ date: today, teacher_id: user?.id }),
    enabled:  !!user?.id,
  })

  // Flatten today's sessions from the week view
  const todaySessions = (() => {
    if (!weekData) return []
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    const dayKey   = dayNames[new Date().getDay()]
    return weekData[dayKey]?.slots ?? []
  })()

  return (
    <div className="fade-in space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard to="/schedule"    label="Séances / Sem." value={stats?.sessions        ?? 0} sub="Cette semaine" icon="📅" color="green"  />
        <StatCard to="/absences"    label="Absences"        value={stats?.pendingAbsences ?? 0} sub="À valider"     icon="📋" color="yellow" />
        <StatCard to="/assignments" label="Devoirs"         value={stats?.assignments     ?? 0} sub="En attente"    icon="📝" color="purple" />
        <StatCard to="/modules"     label="Groupes"         value={stats?.groups          ?? 0} sub="Assignés"      icon="📚" color="blue"   />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's sessions — real data */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Séances Aujourd'hui</h3>
            <Link to="/schedule" className="text-xs text-brand-blue hover:underline">Voir tout →</Link>
          </div>
          {weekLoading ? (
            <p className="text-xs text-slate-400 text-center py-6">Chargement...</p>
          ) : todaySessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune séance aujourd'hui</p>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 hover:bg-brand-blue-xs transition-all">
                  <div className="text-xs font-bold text-brand-blue w-10 flex-shrink-0">
                    {s.start_slot != null ? `S${s.start_slot + 1}` : '—'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.module?.name ?? '—'}</p>
                    <p className="text-[11px] text-slate-500">{s.group?.name ?? '—'}{s.room ? ` · ${s.room.name}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending absences — direct link, not fake data */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Absences à Valider</h3>
            <Link to="/absences" className="text-xs text-brand-blue hover:underline">Gérer →</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <p className="text-3xl">📋</p>
            <p className="text-sm text-slate-500 text-center">
              {stats?.pendingAbsences
                ? `${stats.pendingAbsences} absence${stats.pendingAbsences > 1 ? 's' : ''} en attente`
                : 'Aucune absence en attente'}
            </p>
            <Link to="/absences" className="btn-secondary text-xs">Ouvrir les absences →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stagiaire ─────────────────────────────────────────────────────────────────
function StagiaireDashboard() {
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn:  () => academicApi.getStudent(user.id),
    enabled:  !!user?.id,
  })
  const groupId = profile?.group_id

  const today = new Date().toISOString().split('T')[0]
  const { data: weekData, isLoading: weekLoading } = useQuery({
    queryKey: ['schedule', 'week', today, groupId],
    queryFn:  () => academicApi.getWeekSchedule({ date: today, group_id: groupId }),
    enabled:  !!groupId,
  })

  const { data: absenceData } = useQuery({
    queryKey: ['absences', 'my', 1],
    queryFn:  () => import('../api/index.js').then(m => m.absencesApi.list({ page: 1, limit: 5 })),
  })

  const allSessions = weekData
    ? Object.values(weekData).flatMap(day => day.slots ?? [])
    : []
  const myAbsences = absenceData?.data ?? []

  return (
    <div className="fade-in space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard to="/absences"    label="Mes Absences" value={absenceData?.pagination?.total ?? 0} sub="Total"         icon="📋" color="yellow" />
        <StatCard to="/assignments" label="Devoirs"       value={0}                                  sub="À rendre"       icon="📝" color="red"    />
        <StatCard to="/documents"   label="Documents"     value={0}                                  sub="Disponibles"    icon="📁" color="blue"   />
        <StatCard to="/schedule"    label="Modules"       value={allSessions.length}                 sub="Cette semaine"  icon="📚" color="green"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Real schedule for this week */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Emploi du Temps</h3>
            <Link to="/schedule" className="text-xs text-brand-blue hover:underline">Voir tout →</Link>
          </div>
          {!groupId ? (
            <p className="text-sm text-slate-400 text-center py-6">Vous n'êtes affecté à aucun groupe</p>
          ) : weekLoading ? (
            <p className="text-xs text-slate-400 text-center py-6">Chargement...</p>
          ) : allSessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune séance cette semaine</p>
          ) : (
            <div className="space-y-2">
              {allSessions.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 hover:bg-brand-blue-xs transition-all">
                  <div className="text-xs font-bold text-brand-blue w-10 flex-shrink-0">S{(s.start_slot ?? 0) + 1}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.module?.name ?? '—'}</p>
                    <p className="text-[11px] text-slate-500">{s.room?.name ?? 'Sans salle'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real recent absences */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Mes Dernières Absences</h3>
            <Link to="/absences" className="text-xs text-brand-blue hover:underline">Gérer →</Link>
          </div>
          {myAbsences.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Aucune absence déclarée</p>
          ) : (
            <div className="space-y-2">
              {myAbsences.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{a.sessions?.[0]?.instance
                      ? new Date(a.sessions[0].instance.date).toLocaleDateString('fr-FR')
                      : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">{a.reason ?? 'Sans motif'}</p>
                  </div>
                  {a.status === 'approved' && <Badge variant="green">Justifié</Badge>}
                  {a.status === 'pending'  && <Badge variant="yellow">En attente</Badge>}
                  {a.status === 'rejected' && <Badge variant="red">Refusé</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>{user?.role === 'direction' ? 'Espace Direction' : user?.role === 'formateur' ? 'Espace Formateur' : 'Espace Stagiaire'}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700">Tableau de Bord</span>
            </nav>
            <h1 className="page-title">{greeting}, {user?.first_name} 👋</h1>
            <p className="page-subtitle">
              {user?.role === 'direction'  ? "Rapport d'activité — OFPPT Casablanca NTIC"
               : user?.role === 'formateur' ? 'Votre planning et activités de la semaine'
               : 'Votre espace académique personnel'}
            </p>
          </div>
        </div>
        {user?.role === 'direction'  && <DirectionDashboard />}
        {user?.role === 'formateur'  && <FormateurDashboard />}
        {user?.role === 'stagiaire'  && <StagiaireDashboard />}
      </div>
    </AppShell>
  )
}
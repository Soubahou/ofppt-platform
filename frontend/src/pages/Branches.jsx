import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Modal from '../components/ui/Modal'
import { Badge } from '../components/ui/index.jsx'
import { EmptyState, SkeletonCard } from '../components/shared/index.jsx'
import { academicApi } from '../api/academic.api'
import { usersApi }    from '../api/users.api'
import toast from 'react-hot-toast'

// ─── Group detail modal ────────────────────────────────────────────────────────
function GroupDetailModal({ group, onClose }) {
  const qc       = useQueryClient()
  const navigate = useNavigate()

  const { data: studentsData } = useQuery({
    queryKey: ['group-students', group?.id],
    queryFn:  () => academicApi.getGroupStudents(group.id, { limit: 100 }),
    enabled:  !!group,
  })

  // Load user data so we can display names (Student records only have user_id)
  const { data: usersData } = useQuery({
    queryKey: ['users', { role: 'stagiaire' }],
    queryFn:  () => usersApi.list({ role: 'stagiaire', limit: 200 }),
    enabled:  !!group,
  })

  const students = studentsData?.data ?? []
  const userMap  = Object.fromEntries((usersData?.data ?? []).map(u => [u.id, u]))

  const deleteGroup = useMutation({
    mutationFn: () => academicApi.deleteGroup(group.id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success(`Groupe ${group.name} supprimé`)
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur lors de la suppression'),
  })

  const removeStudent = useMutation({
    mutationFn: (userId) => academicApi.updateStudent(userId, { group_id: null }),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['group-students', group.id] })
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Stagiaire retiré du groupe')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const handleDelete = () => {
    if (window.confirm(`Supprimer le groupe "${group.name}" ? Les stagiaires seront déliés. Action irréversible.`))
      deleteGroup.mutate()
  }

  const goTo = (path) => { onClose(); navigate(path) }

  return (
    <Modal open={!!group} onClose={onClose} title={`Groupe ${group?.name ?? ''}`} size="md">
      {group && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-brand-blue text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
              {group.name?.slice(0, 2)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{group.name}</p>
              <p className="text-xs text-slate-500">
                {students.length} stagiaire{students.length !== 1 ? 's' : ''}
                {' · '}Capacité : {group.max_students ?? '—'}
              </p>
            </div>
          </div>

          {/* Navigation shortcuts */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => goTo(`/schedule?group_id=${group.id}`)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue text-sm font-medium rounded-xl border border-brand-blue/20 transition-colors"
            >
              📅 Planning
            </button>
            <button
              onClick={() => goTo(`/absences?group_id=${group.id}`)}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium rounded-xl border border-amber-200 transition-colors"
            >
              📋 Absences
            </button>
          </div>

          {/* Students list */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Stagiaires ({students.length})
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Aucun stagiaire inscrit</p>
              ) : students.map((s, i) => {
                const u = userMap[s.user_id]
                return (
                  <div
                    key={s.user_id ?? i}
                    className="flex items-center justify-between px-3 py-2 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                        {u?.first_name?.[0] ?? '#'}
                      </div>
                      <span className="text-sm text-slate-700">
                        {u ? `${u.first_name} ${u.last_name}` : `Stagiaire #${s.user_id}`}
                      </span>
                    </div>
                    <button
                      onClick={() => removeStudent.mutate(s.user_id)}
                      disabled={removeStudent.isPending}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                    >
                      Retirer
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Fermer
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl border border-red-200 transition-colors disabled:opacity-50"
            >
              {deleteGroup.isPending ? '...' : '🗑 Supprimer'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Add student to branch modal ───────────────────────────────────────────────
function AddStudentModal({ branch, onClose }) {
  const qc = useQueryClient()
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [searchTerm, setSearchTerm]           = useState('')

  // All stagiaire users
  const { data: stagiairesData } = useQuery({
    queryKey: ['users', { role: 'stagiaire' }],
    queryFn:  () => usersApi.list({ role: 'stagiaire', limit: 200 }),
    enabled:  !!branch,
  })

  // All student profiles — to know who already has a group
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn:  () => academicApi.listStudents({ limit: 500 }),
    enabled:  !!branch,
  })

  const groups   = branch?.groups ?? []
  const students = studentsData?.data ?? []

  // Auto-assign: least-full group that still has space
  const autoGroup = [...groups]
    .filter(g => (g._count?.students ?? 0) < (g.max_students ?? 9999))
    .sort((a, b) => (a._count?.students ?? 0) - (b._count?.students ?? 0))[0]

  const effectiveGroupId = selectedGroupId ? Number(selectedGroupId) : autoGroup?.id
  const effectiveGroup   = groups.find(g => g.id === effectiveGroupId)

  // Map user_id → existing student profile
  const studentProfileMap = Object.fromEntries(students.map(s => [s.user_id, s]))

  // Users already assigned to a group in THIS branch
  const branchGroupIds   = new Set(groups.map(g => g.id))
  const assignedHereIds  = new Set(
    students
      .filter(s => s.group_id && branchGroupIds.has(s.group_id))
      .map(s => s.user_id)
  )

  // Filtered user list
  const allStagiaires = (stagiairesData?.data ?? []).filter(u =>
    !searchTerm ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const assignMutation = useMutation({
    mutationFn: async (userId) => {
      if (!effectiveGroupId)
        throw new Error('Aucun groupe disponible')
      const existing = studentProfileMap[userId]
      if (existing) {
        // Profile exists — update group
        return academicApi.updateStudent(userId, { group_id: effectiveGroupId })
      } else {
        // Create new profile with group
        return academicApi.createStudent({
          user_id:         userId,
          group_id:        effectiveGroupId,
          enrollment_date: new Date().toISOString().split('T')[0],
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      qc.invalidateQueries({ queryKey: ['students-all'] })
      qc.invalidateQueries({ queryKey: ['group-students'] })
      toast.success(`Stagiaire ajouté au groupe ${effectiveGroup?.name ?? ''}`)
    },
    onError: (err) => toast.error(err.response?.data?.message ?? err.message ?? 'Erreur'),
  })

  const noGroups = groups.length === 0
  const allFull  = !autoGroup && groups.length > 0

  return (
    <Modal
      open={!!branch}
      onClose={onClose}
      title={`Ajouter un stagiaire — ${branch?.name ?? ''}`}
      size="lg"
    >
      <div className="space-y-4">

        {noGroups ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-700 font-medium">⚠️ Aucun groupe dans cette filière</p>
            <p className="text-sm text-amber-600 mt-1">
              Créez d'abord un groupe avant d'ajouter des stagiaires.
            </p>
          </div>
        ) : allFull ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-700 font-medium">⚠️ Tous les groupes sont complets</p>
            <p className="text-sm text-red-600 mt-1">
              Augmentez la capacité d'un groupe ou créez-en un nouveau.
            </p>
          </div>
        ) : (
          <>
            {/* Auto-assignment info */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-blue-200 text-blue-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                {effectiveGroup?.name?.slice(0, 2)}
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold">Attribution automatique</p>
                <p className="text-sm text-blue-800">
                  Le stagiaire sera ajouté au groupe{' '}
                  <strong>{effectiveGroup?.name ?? '—'}</strong>
                  {' '}·{' '}
                  {effectiveGroup?._count?.students ?? 0}/{effectiveGroup?.max_students ?? '∞'} places
                </p>
              </div>
            </div>

            {/* Optional group override */}
            <div>
              <label className="label">
                Changer de groupe <span className="text-slate-400 font-normal">(optionnel)</span>
              </label>
              <select
                className="select"
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
              >
                <option value="">
                  Attribution automatique — {autoGroup?.name} ({autoGroup?._count?.students ?? 0}/{autoGroup?.max_students ?? '∞'})
                </option>
                {groups.map(g => {
                  const count = g._count?.students ?? 0
                  const full  = count >= (g.max_students ?? 9999)
                  return (
                    <option key={g.id} value={g.id} disabled={full}>
                      {g.name} — {count}/{g.max_students ?? '∞'} places{full ? ' (complet)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="label">Rechercher un stagiaire</label>
              <input
                className="input"
                placeholder="Nom, prénom..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Student list */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {allStagiaires.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Aucun stagiaire trouvé</p>
                ) : allStagiaires.map(u => {
                  const alreadyHere    = assignedHereIds.has(u.id)
                  const existingStudent = studentProfileMap[u.id]
                  const currentGroup   = existingStudent?.group?.name

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
                        alreadyHere ? 'bg-green-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {u.first_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {u.first_name} {u.last_name}
                          </p>
                          {alreadyHere && (
                            <p className="text-[11px] text-green-600">✓ Inscrit dans {currentGroup}</p>
                          )}
                          {!alreadyHere && currentGroup && (
                            <p className="text-[11px] text-slate-400">Actuellement dans {currentGroup}</p>
                          )}
                          {!alreadyHere && !currentGroup && (
                            <p className="text-[11px] text-slate-400">Non inscrit</p>
                          )}
                        </div>
                      </div>

                      {alreadyHere ? (
                        <Badge variant="green">Inscrit</Badge>
                      ) : (
                        <button
                          onClick={() => assignMutation.mutate(u.id)}
                          disabled={assignMutation.isPending}
                          className="text-xs text-white bg-brand-blue hover:bg-brand-blue/90 px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
                        >
                          {assignMutation.isPending ? '...' : 'Ajouter'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <button onClick={onClose} className="btn-secondary w-full justify-center">
              Fermer
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Branches() {
  const qc = useQueryClient()
  const [search,           setSearch]           = useState('')
  const [showBranch,       setShowBranch]        = useState(false)
  const [showGroup,        setShowGroup]         = useState(false)
  const [targetBranch,     setTarget]            = useState(null)
  const [selectedGroup,    setSelectedGroup]     = useState(null)
  const [addStudentBranch, setAddStudentBranch]  = useState(null)
  const [bForm, setBForm] = useState({ name: '', max_students: 200 })
  const [gForm, setGForm] = useState({ name: '', max_students: 30 })

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn:  () => academicApi.listBranches(),
  })

  const createBranch = useMutation({
    mutationFn: () => academicApi.createBranch(bForm),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Filière créée')
      setShowBranch(false)
      setBForm({ name: '', max_students: 200 })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const createGroup = useMutation({
    mutationFn: () => academicApi.createGroup({
      name:         gForm.name,
      max_students: Number(gForm.max_students),
      branch_id:    targetBranch?.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Groupe créé')
      setShowGroup(false)
      setGForm({ name: '', max_students: 30 })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const allBranches = data?.data ?? []
  const filtered    = search
    ? allBranches.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : allBranches

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Administration</span><span>/</span>
              <span className="text-slate-700">Filières & Groupes</span>
            </nav>
            <h1 className="page-title">Filières & Groupes</h1>
            <p className="page-subtitle">Organisation structurelle de l'établissement</p>
          </div>
          <button onClick={() => setShowBranch(true)} className="btn-primary">
            + Nouvelle Filière
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Rechercher une filière..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🏛" title="Aucune filière" description="Créez votre première filière." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(b => {
              const totalStudents = (b.groups ?? []).reduce(
                (sum, g) => sum + (g._count?.students ?? 0), 0
              )
              return (
                <div key={b.id} className="card p-5 fade-in">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800">{b.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(b.groups ?? []).length} groupe{(b.groups ?? []).length !== 1 ? 's' : ''}
                        {' · '}
                        {totalStudents} stagiaire{totalStudents !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setTarget(b); setShowGroup(true) }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        + Groupe
                      </button>
                      <button
                        onClick={() => setAddStudentBranch(b)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        + Stagiaire
                      </button>
                    </div>
                  </div>

                  {/* Groups list */}
                  <div className="space-y-2">
                    {(b.groups ?? []).length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Aucun groupe — cliquez sur + Groupe pour commencer.
                      </p>
                    ) : (b.groups ?? []).map(g => {
                      const count   = g._count?.students ?? 0
                      const pct     = g.max_students ? Math.round((count / g.max_students) * 100) : 0
                      const full    = count >= (g.max_students ?? 9999)
                      return (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGroup(g)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-brand-blue-xs hover:border-brand-blue/30 hover:shadow-sm transition-all duration-150 active:scale-[0.99] cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-brand-blue/10 text-brand-blue font-bold text-xs flex items-center justify-center">
                              {g.name?.slice(0, 2)}
                            </div>
                            <span className="font-semibold text-slate-700 text-sm group-hover:text-brand-blue transition-colors">
                              {g.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {count}/{g.max_students ?? '∞'}
                            </span>
                            {/* Capacity bar */}
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  full ? 'bg-red-400' : pct > 75 ? 'bg-amber-400' : 'bg-green-400'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            {full && <Badge variant="red" className="text-[10px]">Complet</Badge>}
                            <span className="text-slate-300 group-hover:text-brand-blue transition-colors text-xs">→</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create branch modal */}
      <Modal open={showBranch} onClose={() => setShowBranch(false)} title="Créer une filière">
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la filière</label>
            <input
              className="input"
              placeholder="Ex: Développement Digital"
              value={bForm.name}
              onChange={e => setBForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Capacité max (stagiaires)</label>
            <input
              type="number"
              className="input"
              value={bForm.max_students}
              onChange={e => setBForm(f => ({ ...f, max_students: Number(e.target.value) }))}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => createBranch.mutate()}
              disabled={!bForm.name || createBranch.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {createBranch.isPending ? 'Création...' : 'Créer la filière'}
            </button>
            <button onClick={() => setShowBranch(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      </Modal>

      {/* Create group modal */}
      <Modal
        open={showGroup}
        onClose={() => setShowGroup(false)}
        title={`Nouveau groupe — ${targetBranch?.name ?? ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nom du groupe</label>
            <input
              className="input"
              placeholder="Ex: DD201"
              value={gForm.name}
              onChange={e => setGForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Nombre max de stagiaires</label>
            <input
              type="number"
              className="input"
              value={gForm.max_students}
              onChange={e => setGForm(f => ({ ...f, max_students: Number(e.target.value) }))}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => createGroup.mutate()}
              disabled={!gForm.name || createGroup.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {createGroup.isPending ? 'Création...' : 'Créer le groupe'}
            </button>
            <button onClick={() => setShowGroup(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      </Modal>

      {/* Group detail modal */}
      <GroupDetailModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />

      {/* Add student to branch modal */}
      <AddStudentModal branch={addStudentBranch} onClose={() => setAddStudentBranch(null)} />
    </AppShell>
  )
}
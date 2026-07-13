import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import Modal from "../components/ui/Modal";
import { Badge } from "../components/ui/index.jsx";
import { EmptyState, SkeletonCard } from "../components/shared/index.jsx";
import { academicApi } from "../api/academic.api";
import { usersApi }    from "../api/users.api";
import toast from "react-hot-toast";

export default function Modules() {
  const qc = useQueryClient();
  const [search, setSearch]               = useState("");
  const [showCreate, setCreate]           = useState(false);
  const [showTeachers, setShowTeach]      = useState(false);
  const [selected, setSelected]           = useState(null);
  const [showBranchAssign, setBranchAssign] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "theoretical",
    credits: 3,
    total_hours: 60,
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["modules"],
    queryFn:  () => academicApi.listModules(),
  });

  const { data: moduleTeachers } = useQuery({
    queryKey: ["module-teachers", selected?.id],
    queryFn:  () => academicApi.getModuleTeachers(selected.id),
    enabled:  !!selected,
  });

  // Always loaded so module cards can show names immediately
  const { data: allTeachers } = useQuery({
    queryKey: ["users", { role: "formateur" }],
    queryFn:  () => usersApi.list({ role: "formateur", limit: 100 }),
  });

  // Branches with their groups — needed for branch-level MTG assignment
  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn:  () => academicApi.listBranches({ limit: 100 }),
    enabled:  showTeachers,
  });

  // All MTGs — used to know which groups already have this module assigned
  const { data: allMTGs } = useQuery({
    queryKey: ["mtg-all"],
    queryFn:  () => academicApi.listMTG({ limit: 200 }),
    enabled:  showTeachers && !!selected,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createModule = useMutation({
    mutationFn: () =>
      academicApi.createModule({
        name:        form.name,
        type:        form.type,
        credits:     Number(form.credits),
        total_hours: Number(form.total_hours),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Module créé");
      setCreate(false);
      setForm({ name: "", type: "theoretical", credits: 3, total_hours: 60 });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const assignTeacher = useMutation({
    mutationFn: (teacherId) => academicApi.assignTeacher(selected.id, teacherId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module-teachers"] });
      qc.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Formateur assigné");
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const removeTeacher = useMutation({
    mutationFn: (teacherUserId) => academicApi.removeTeacher(selected.id, teacherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module-teachers"] });
      qc.invalidateQueries({ queryKey: ["modules"] });
      toast.success("Formateur retiré");
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  // Assign module to ALL unassigned groups in a branch (creates one MTG per group)
  const assignToBranch = useMutation({
    mutationFn: async ({ teacherUserId, groups }) => {
      for (const group of groups) {
        await academicApi.upsertModuleTeacherGroup({
          module_id:      selected.id,
          teacher_id:     teacherUserId,
          group_id:       group.id,
          hours_required: selected.total_hours ?? 40,
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["mtg-all"] });
      toast.success(
        `Module assigné à ${vars.groups.length} groupe(s) de la filière`
      );
      setSelectedBranchId("");
      setSelectedTeacherUserId("");
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const allModules = data?.data        ?? [];
  const teachers   = moduleTeachers?.data ?? [];
  const allT       = allTeachers?.data    ?? [];
  const branches   = branchesData?.data   ?? [];

  // name lookup: auth-service user id → full name
  const userMap = Object.fromEntries(allT.map((u) => [u.id, u]));

  // Group IDs that already have this module assigned (via any MTG)
  const assignedGroupIds = new Set(
    (allMTGs?.data ?? [])
      .filter((mtg) => mtg.module_teacher?.module?.id === selected?.id)
      .map((mtg) => mtg.group?.id)
      .filter(Boolean)
  );

  // Only show branches that have at least one group NOT yet assigned
  const availableBranches = branches.filter((b) =>
    (b.groups ?? []).some((g) => !assignedGroupIds.has(g.id))
  );

  const selectedBranch = branches.find(
    (b) => String(b.id) === String(selectedBranchId)
  );
  const unassignedGroupsInBranch = (selectedBranch?.groups ?? []).filter(
    (g) => !assignedGroupIds.has(g.id)
  );

  // Teachers assigned to this module (to use for branch assignment)
  const assignedIds = new Set(teachers.map((t) => t.user_id));

  const filtered = allModules.filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Administration</span>
              <span>/</span>
              <span className="text-slate-700">Modules</span>
            </nav>
            <h1 className="page-title">Gestion des Modules</h1>
            <p className="page-subtitle">
              Modules de formation et affectation des formateurs
            </p>
          </div>
          <button onClick={() => setCreate(true)} className="btn-primary">
            + Nouveau Module
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-xs"
          />
        </div>

        {/* Module cards */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Aucun module"
            description={
              allModules.length > 0
                ? "Aucun module ne correspond à la recherche."
                : "Créez votre premier module."
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="card-hover p-5 group cursor-pointer"
                onClick={() => {
                  setSelected(m);
                  setShowTeach(true);
                  setBranchAssign(false);
                  setSelectedBranchId("");
                  setSelectedTeacherUserId("");
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <Badge variant={m.type === "practical" ? "green" : "blue"}>
                    {m.type === "practical" ? "Pratique" : "Théorique"}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {m.total_hours ?? "—"}h
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 mb-2 group-hover:text-brand-blue transition-colors">
                  {m.name}
                </h3>

                {/* Teacher name badges — resolved from auth-service */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(m.teachers ?? []).length === 0 ? (
                    <span className="text-xs text-slate-400 italic">
                      Aucun formateur
                    </span>
                  ) : (
                    (m.teachers ?? []).slice(0, 3).map((t) => {
                      const u = userMap[t.user_id];
                      return (
                        <span
                          key={t.user_id}
                          className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full"
                        >
                          {u
                            ? `${u.first_name} ${u.last_name}`
                            : `Formateur #${t.user_id}`}
                        </span>
                      );
                    })
                  )}
                </div>

                <p className="text-xs text-brand-blue font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Gérer les formateurs →
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create module modal ──────────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => setCreate(false)}
        title="Créer un module"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nom du module</label>
            <input
              className="input"
              placeholder="Ex: Développement Web"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="theoretical">Théorique</option>
              <option value="practical">Pratique</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Crédits</label>
              <input
                type="number"
                className="input"
                value={form.credits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="label">Volume horaire (h)</label>
              <input
                type="number"
                className="input"
                value={form.total_hours}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    total_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => createModule.mutate()}
              disabled={!form.name || createModule.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {createModule.isPending ? "Création..." : "Créer"}
            </button>
            <button onClick={() => setCreate(false)} className="btn-secondary">
              Annuler
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Manage teachers + assign to branch modal ─────────────────────────── */}
      <Modal
        open={showTeachers}
        onClose={() => {
          setShowTeach(false);
          setBranchAssign(false);
          setSelectedBranchId("");
          setSelectedTeacherUserId("");
        }}
        title={`Formateurs — ${selected?.name ?? ""}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* ── Assigned teachers ──────────────────────────────────────── */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Assignés ({teachers.length})
            </h4>
            {teachers.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Aucun formateur assigné
              </p>
            ) : (
              <div className="space-y-1.5">
                {teachers.map((t) => {
                  const u = userMap[t.user_id];
                  return (
                    <div
                      key={t.user_id}
                      className="flex items-center justify-between px-3 py-2.5 bg-green-50 rounded-xl border border-green-100"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-200 text-green-800 font-bold text-xs flex items-center justify-center">
                          {u?.first_name?.[0]}
                          {u?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {u
                              ? `${u.first_name} ${u.last_name}`
                              : `Formateur #${t.user_id}`}
                          </p>
                          {t.specialization &&
                            t.specialization !== "Non renseigné" && (
                              <p className="text-[11px] text-slate-500">
                                {t.specialization}
                              </p>
                            )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeTeacher.mutate(t.user_id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        Retirer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* ── Available teachers to assign ───────────────────────────── */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
              Disponibles
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {allT.filter((t) => !assignedIds.has(t.id)).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Tous les formateurs sont déjà assignés
                </p>
              ) : (
                allT
                  .filter((t) => !assignedIds.has(t.id))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <span className="text-sm text-slate-700">
                        {t.first_name} {t.last_name}
                      </span>
                      <button
                        onClick={() => assignTeacher.mutate(t.id)}
                        disabled={assignTeacher.isPending}
                        className="text-xs text-brand-blue hover:underline font-medium disabled:opacity-40"
                      >
                        Assigner
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* ── Assign module to a branch (creates MTG for each group) ─── */}
          <div>
            <button
              onClick={() => {
                setBranchAssign((v) => !v);
                setSelectedBranchId("");
                setSelectedTeacherUserId("");
              }}
              className="flex items-center gap-2 text-xs font-semibold text-brand-blue hover:underline"
            >
              <span>{showBranchAssign ? "▲" : "▼"}</span>
              Assigner ce module à une filière
            </button>

            {showBranchAssign && (
              <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500">
                  Crée les liens module + formateur + groupe pour tous les
                  groupes non encore assignés dans la filière choisie.
                </p>

                {teachers.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ Assignez d'abord un formateur à ce module (section
                    ci-dessus).
                  </p>
                ) : (
                  <>
                    {/* Formateur select */}
                    <div>
                      <label className="label">Formateur</label>
                      <select
                        className="select"
                        value={selectedTeacherUserId}
                        onChange={(e) =>
                          setSelectedTeacherUserId(e.target.value)
                        }
                      >
                        <option value="">— Sélectionner un formateur —</option>
                        {teachers.map((t) => {
                          const u = userMap[t.user_id];
                          return (
                            <option key={t.user_id} value={t.user_id}>
                              {u
                                ? `${u.first_name} ${u.last_name}`
                                : `Formateur #${t.user_id}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Branch select — only shows branches with unassigned groups */}
                    <div>
                      <label className="label">Filière</label>
                      {availableBranches.length === 0 ? (
                        <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          ✅ Ce module est déjà assigné à tous les groupes de
                          toutes les filières.
                        </p>
                      ) : (
                        <select
                          className="select"
                          value={selectedBranchId}
                          onChange={(e) => setSelectedBranchId(e.target.value)}
                        >
                          <option value="">— Sélectionner une filière —</option>
                          {availableBranches.map((b) => {
                            const count = (b.groups ?? []).filter(
                              (g) => !assignedGroupIds.has(g.id)
                            ).length;
                            return (
                              <option key={b.id} value={b.id}>
                                {b.name} — {count} groupe
                                {count > 1 ? "s" : ""} disponible
                                {count > 1 ? "s" : ""}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                    {/* Preview of groups that will be assigned */}
                    {selectedBranchId && unassignedGroupsInBranch.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                        <p className="text-[11px] text-slate-500 mb-1">
                          Groupes qui seront assignés :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {unassignedGroupsInBranch.map((g) => (
                            <span
                              key={g.id}
                              className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() =>
                        assignToBranch.mutate({
                          teacherUserId: Number(selectedTeacherUserId),
                          groups: unassignedGroupsInBranch,
                        })
                      }
                      disabled={
                        !selectedBranchId ||
                        !selectedTeacherUserId ||
                        unassignedGroupsInBranch.length === 0 ||
                        assignToBranch.isPending
                      }
                      className="btn-primary w-full justify-center"
                    >
                      {assignToBranch.isPending
                        ? "Assignation..."
                        : `Assigner à ${unassignedGroupsInBranch.length} groupe(s)`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
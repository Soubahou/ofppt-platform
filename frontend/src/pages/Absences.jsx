import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../hooks/useAuth";
import { useSchedule } from "../hooks/useSchedule";
import { Badge, Pagination } from "../components/ui/index.jsx";
import { SkeletonRow, EmptyState } from "../components/shared/index.jsx";
import { absencesApi } from "../api/index.js";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  approved: <Badge variant="green">Justifié</Badge>,
  pending: <Badge variant="yellow">En attente</Badge>,
  rejected: <Badge variant="red">Non justifié</Badge>,
};

function normalizeAbsence(a) {
  const firstInstance = a.sessions?.[0]?.instance;
  return {
    ...a,
    display_date: firstInstance?.date
      ? new Date(firstInstance.date).toLocaleDateString("fr-FR")
      : "—",
    session_count: a.sessions?.length ?? 0,
  };
}

// ─── Stagiaire workspace ──────────────────────────────────────────────────────
function StagiaireWorkspace() {
  const { user } = useAuth(); // FIX 1: was missing entirely
  const qc = useQueryClient();
  const [form, setForm] = useState({ reason: "", instance_ids: [] });
  const [page, setPage] = useState(1);

  const {
    weekStart,
    prevWeek,
    nextWeek,
    goToToday,
    data: weekData,
  } = useSchedule({ userId: user?.id });

  const availableInstances = Object.values(weekData?.week ?? {}).flatMap(
    (day) =>
      (day.slots ?? [])
        .filter((s) => s.instance && !s.instance.is_cancelled)
        .map((s) => ({
          id: s.instance.id,
          label: `${new Date(day.date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })} — ${s.module?.name ?? "Séance"}`,
        })),
  );

  const toggleInstance = (id) =>
    setForm((f) => ({
      ...f,
      instance_ids: f.instance_ids.includes(id)
        ? f.instance_ids.filter((i) => i !== id)
        : [...f.instance_ids, id],
    }));

  const { data, isLoading } = useQuery({
    queryKey: ["absences", "my", { page }],
    queryFn: () => absencesApi.list({ page }),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      absencesApi.submit({
        instance_ids: form.instance_ids,
        reason: form.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      setForm({ reason: "", instance_ids: [] });
      toast.success("Demande soumise avec succès");
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message ?? err.response?.data?.error ?? "Erreur",
      ),
  });

  const canSubmit =
    form.instance_ids.length > 0 && form.reason.trim().length > 5;
  const absences = (data?.data ?? []).map(normalizeAbsence);
  const totalPages = data?.pagination?.total_pages ?? 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">
            📝 Déclarer une absence
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Séances manquées</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevWeek}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 text-xs"
                    title="Semaine précédente"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={goToToday}
                    className="text-[11px] px-2 h-6 rounded-md text-slate-500 hover:bg-slate-100 font-medium"
                  >
                    {weekStart.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={nextWeek}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 text-xs"
                    title="Semaine suivante"
                  >
                    →
                  </button>
                </div>
              </div>
              {!user?.id ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Chargement...
                </p>
              ) : availableInstances.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-4 text-center">
                  Aucune séance trouvée pour cette semaine.
                  {!weekData && " Vérifiez que vous êtes affecté à un groupe."}
                </p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {availableInstances.map((inst) => (
                    <label
                      key={inst.id}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={form.instance_ids.includes(inst.id)}
                        onChange={() => toggleInstance(inst.id)}
                        className="rounded accent-brand-blue"
                      />
                      {inst.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Motif</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Ex: Rendez-vous médical certifié..."
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
              {form.reason.trim().length > 0 &&
                form.reason.trim().length <= 5 && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Motif trop court (min 6 caractères)
                  </p>
                )}
            </div>

            <button
              onClick={() => submitMutation.mutate()}
              disabled={!canSubmit || submitMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {submitMutation.isPending ? "Envoi..." : "Soumettre la demande"}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">
            📋 Mes Demandes d'Absences
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left rounded-l-lg">Date</th>
                  <th className="table-header text-left">Séances</th>
                  <th className="table-header text-left">Motif</th>
                  <th className="table-header text-left rounded-r-lg">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonRow key={i} cols={4} />
                  ))
                ) : absences.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon=""
                        title="Aucune demande"
                        description="Vos demandes d'absence apparaîtront ici."
                      />
                    </td>
                  </tr>
                ) : (
                  absences.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="table-cell">{a.display_date}</td>
                      <td className="table-cell">
                        {a.session_count} séance{a.session_count > 1 ? "s" : ""}
                      </td>
                      <td className="table-cell max-w-[200px] truncate">
                        {a.reason}
                      </td>
                      <td className="table-cell">
                        {STATUS_BADGE[a.status] ?? (
                          <Badge variant="gray">{a.status}</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Formateur workspace — read-only view of their groups' absences ────────────
function FormateurWorkspace() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["absences", "formateur", { page, status: statusFilter }],
    queryFn: () =>
      absencesApi.list({ page, status: statusFilter || undefined, limit: 15 }),
  });

  const absences = (data?.data ?? []).map(normalizeAbsence);
  const totalPages = data?.pagination?.total_pages ?? 1;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-bold text-slate-800 text-sm">
          📋 Absences de vos groupes
        </h3>
        <select
          className="select w-auto ml-auto"
          value={statusFilter}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Validées</option>
          <option value="rejected">Rejetées</option>
        </select>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 text-xs text-blue-700">
        ℹ️ La validation des absences est effectuée par la direction.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left rounded-l-lg">Stagiaire</th>
              <th className="table-header text-left">Date</th>
              <th className="table-header text-left">Séances</th>
              <th className="table-header text-left">Motif</th>
              <th className="table-header text-left rounded-r-lg">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={5} />
              ))
            ) : absences.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon="" title="Aucune absence" />
                </td>
              </tr>
            ) : (
              absences.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60">
                  <td className="table-cell font-medium">#{a.user_id}</td>
                  <td className="table-cell">{a.display_date}</td>
                  <td className="table-cell">
                    {a.session_count} séance{a.session_count > 1 ? "s" : ""}
                  </td>
                  <td className="table-cell max-w-[200px] truncate text-slate-500">
                    {a.reason ?? "—"}
                  </td>
                  <td className="table-cell">
                    {STATUS_BADGE[a.status] ?? (
                      <Badge variant="gray">{a.status}</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ─── Direction workspace — full control with approve/reject ───────────────────
function DirectionWorkspace() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatus] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["absences-stats"],
    queryFn: () => absencesApi.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["absences", "admin", { page, status: statusFilter }],
    queryFn: () =>
      absencesApi.list({ page, status: statusFilter || undefined, limit: 15 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => absencesApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      qc.invalidateQueries({ queryKey: ["absences-stats"] });
      toast.success("Absence validée");
    },
    onError: (err) =>
      toast.error(
        err.response?.data?.message ?? "Erreur lors de la validation",
      ),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => absencesApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      qc.invalidateQueries({ queryKey: ["absences-stats"] });
      toast.success("Absence rejetée");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Erreur lors du rejet"),
  });

  const stats = statsData ?? {};
  const absences = (data?.data ?? []).map(normalizeAbsence);
  const totalPages = data?.pagination?.total_pages ?? 1;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total absences",
            value: stats.total ?? "—",
            color: "text-slate-700",
          },
          {
            label: "En attente",
            value: stats.pending ?? "—",
            color: "text-yellow-600",
          },
          {
            label: "Validées",
            value: stats.approved ?? "—",
            color: "text-green-600",
          },
          {
            label: "Rejetées",
            value: stats.rejected ?? "—",
            color: "text-red-600",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-bold text-slate-800 text-sm">
            📋 Toutes les absences
          </h3>
          <select
            className="select w-auto ml-auto"
            value={statusFilter}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Validées</option>
            <option value="rejected">Rejetées</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left rounded-l-lg">
                  Stagiaire
                </th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Séances</th>
                <th className="table-header text-left">Motif</th>
                <th className="table-header text-left">Statut</th>
                <th className="table-header text-center rounded-r-lg">
                  Décision
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} cols={6} />
                ))
              ) : absences.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon="" title="Aucune absence" />
                  </td>
                </tr>
              ) : (
                absences.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="table-cell font-medium">#{a.user_id}</td>
                    <td className="table-cell">{a.display_date}</td>
                    <td className="table-cell">
                      {a.session_count} séance{a.session_count > 1 ? "s" : ""}
                    </td>
                    <td className="table-cell max-w-[180px] truncate text-slate-500">
                      {a.reason ?? "—"}
                    </td>
                    <td className="table-cell">
                      {STATUS_BADGE[a.status] ?? (
                        <Badge variant="gray">{a.status}</Badge>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {a.status === "pending" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => approveMutation.mutate(a.id)}
                            disabled={approveMutation.isPending}
                            className="text-xs text-green-600 hover:text-green-800 font-semibold disabled:opacity-40"
                          >
                            ✓ Valider
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(a.id)}
                            disabled={rejectMutation.isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-40"
                          >
                            ✕ Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Traité</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Absences() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Espace Conseil</span>
              <span>/</span>
              <span className="text-slate-700">Absences</span>
            </nav>
            <h1 className="page-title">Contrôle des Absences</h1>
            <p className="page-subtitle">
              {user?.role === "stagiaire"
                ? "Déposez vos justificatifs d'absence"
                : user?.role === "formateur"
                  ? "Consultez les absences de vos groupes"
                  : "Validez et gérez les absences de l'établissement"}
            </p>
          </div>
        </div>

        {user?.role === "stagiaire" && <StagiaireWorkspace />}
        {user?.role === "formateur" && <FormateurWorkspace />}
        {user?.role === "direction" && <DirectionWorkspace />}
      </div>
    </AppShell>
  );
}

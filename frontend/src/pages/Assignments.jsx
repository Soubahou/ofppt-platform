import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import Modal from "../components/ui/Modal";
import { Badge, Pagination } from "../components/ui/index.jsx";
import { SkeletonRow, EmptyState } from "../components/shared/index.jsx";
import { assignmentsApi, submissionsApi, documentsApi } from "../api/index.js";
import { academicApi } from "../api/academic.api";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  pending: <Badge variant="yellow">En attente</Badge>,
  submitted: <Badge variant="blue">Rendu</Badge>,
  graded: <Badge variant="green">Noté</Badge>,
};

function TeacherView() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [page, setPage] = useState(1);
  const [showCreate, setCreate] = useState(false);
  const [showSubs, setSubs] = useState(false);
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    due_date: "",
    group_id: "",
    module_id: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", { page }],
    queryFn: () => assignmentsApi.list({ page }),
    keepPreviousData: true,
  });
  const { data: subsData } = useQuery({
    queryKey: ["submissions", selected?.id],
    queryFn: () => assignmentsApi.getSubmissions(selected.id),
    enabled: !!selected && showSubs,
  });
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => academicApi.listGroups(),
  });
  const { data: modules } = useQuery({
    queryKey: ["modules"],
    queryFn: () => academicApi.listModules(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file)
        throw { response: { data: { message: "Un fichier est requis" } } };

      // Step 1 — upload the document
      const docFd = new FormData();
      docFd.append("title", form.title);
      docFd.append("type", "exercise");
      docFd.append("file", file);
      const doc = await documentsApi.create(docFd);

      // Step 2 — create the assignment referencing that document
      return assignmentsApi.create({
        document_id: doc.id,
        group_id: form.group_id ? parseInt(form.group_id, 10) : undefined,
        module_id: form.module_id ? parseInt(form.module_id, 10) : undefined,
        due_date: form.due_date || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Devoir créé");
      setCreate(false);
      setFile(null);
      setForm({ title: "", due_date: "", group_id: "" });
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ id, grade, feedback }) =>
      submissionsApi.grade(id, { grade, feedback }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      toast.success("Note enregistrée");
    },
    onError: () => toast.error("Erreur"),
  });

  const assignments = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const subs = subsData?.data ?? [];

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">
            Devoirs & Exercices
          </h3>
          <button
            onClick={() => setCreate(true)}
            className="btn-primary text-xs"
          >
            + Créer un devoir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left rounded-l-lg">Titre</th>
                <th className="table-header text-left">Module</th>
                <th className="table-header text-left">Groupe</th>
                <th className="table-header text-left">Date limite</th>
                <th className="table-header text-left">Rendus</th>
                <th className="table-header text-right rounded-r-lg">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={6} />
                ))
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon="📝"
                      title="Aucun devoir"
                      description="Créez votre premier devoir."
                    />
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="table-row-hover">
                    <td className="table-cell font-medium text-slate-800">
                      {a.title}
                    </td>
                    <td className="table-cell">
                      <Badge variant="blue">
                        {a.module_name ?? a.module_code ?? "—"}
                      </Badge>
                    </td>
                    <td className="table-cell text-slate-500">
                      {a.group_name ?? "—"}
                    </td>
                    <td className="table-cell text-slate-500">
                      {a.due_date
                        ? new Date(a.due_date).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-brand-blue">
                        {a.submission_count ?? 0}
                      </span>
                      <span className="text-slate-400">
                        {" "}
                        / {a.student_count ?? "?"}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => {
                          setSelected(a);
                          setSubs(true);
                        }}
                        className="text-xs text-brand-blue hover:underline font-medium"
                      >
                        Voir les rendus →
                      </button>
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

      <Modal
        open={showCreate}
        onClose={() => {
          setCreate(false);
          setFile(null);
        }}
        title="Créer un devoir"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Titre</label>
            <input
              className="input"
              placeholder="Ex: TP React – Composants & Hooks"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Module</label>
              <select
                className="select"
                value={form.module_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, module_id: e.target.value }))
                }
              >
                <option value="">— Choisir —</option>
                {(modules?.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Groupe</label>
              <select
                className="select"
                value={form.group_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, group_id: e.target.value }))
                }
              >
                <option value="">— Choisir —</option>
                {(groups?.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Date limite de remise</label>
            <input
              type="datetime-local"
              className="input"
              value={form.due_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, due_date: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Fichier joint (optionnel)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-150 ${file ? "border-brand-blue bg-brand-blue-xs" : "border-slate-300 hover:border-brand-blue hover:bg-brand-blue-xs"}`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">📎</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-brand-blue truncate max-w-xs">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(0)} Ko
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500">
                    Cliquez pour joindre un fichier
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    PDF, DOCX, ZIP acceptés
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.zip,.docx,.txt,.xlsx,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                !form.title ||
                !form.module_id ||
                !form.group_id ||
                createMutation.isPending
              }
              className="btn-primary flex-1 justify-center"
            >
              {createMutation.isPending ? "Création..." : "Publier le devoir"}
            </button>
            <button
              onClick={() => {
                setCreate(false);
                setFile(null);
              }}
              className="btn-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showSubs}
        onClose={() => setSubs(false)}
        title={`Rendus — ${selected?.title ?? ""}`}
        size="xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left rounded-l-lg">
                  Stagiaire
                </th>
                <th className="table-header text-left">Groupe</th>
                <th className="table-header text-left">Soumis le</th>
                <th className="table-header text-left">Fichier</th>
                <th className="table-header text-left">Note</th>
                <th className="table-header text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState icon="📭" title="Aucun rendu" />
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <SubRow
                    key={s.id}
                    sub={s}
                    onGrade={(grade, feedback) =>
                      gradeMutation.mutate({ id: s.id, grade, feedback })
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}

function SubRow({ sub, onGrade }) {
  const [editing, setEditing] = useState(false);
  const [grade, setGrade] = useState(sub.grade ?? "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  return (
    <tr className="table-row-hover">
      <td className="table-cell font-medium">{sub.student_name}</td>
      <td className="table-cell text-slate-500">{sub.group_name}</td>
      <td className="table-cell text-slate-500">
        {new Date(sub.submitted_at).toLocaleDateString("fr-FR")}
      </td>
      <td className="table-cell">
        {sub.file_url ? (
          <button
            onClick={() => submissionsApi.download(sub.id)}
            className="text-xs text-brand-blue hover:underline font-medium"
          >
            📎 Voir
          </button>
        ) : (
          "—"
        )}
      </td>
      <td className="table-cell">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={20}
              className="input w-16 text-center text-xs py-1"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
            <span className="text-xs text-slate-500">/20</span>
          </div>
        ) : sub.grade != null ? (
          <span className="font-bold text-brand-blue">{sub.grade}/20</span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>
      <td className="table-cell text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => {
                onGrade(Number(grade), feedback);
                setEditing(false);
              }}
              className="text-xs text-green-600 font-semibold hover:text-green-800"
            >
              Enreg.
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-brand-blue hover:underline"
          >
            {sub.grade != null ? "Modifier" : "Noter"}
          </button>
        )}
      </td>
    </tr>
  );
}

function StagiaireView() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showSubmit, setSubmit] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["assignments", "my", { page }],
    queryFn: () => assignmentsApi.list({ page, mine: true }),
    keepPreviousData: true,
  });

  const submitMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return submissionsApi.submit(selected.id, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Devoir soumis !");
      setSubmit(false);
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const assignments = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Mes Devoirs</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left rounded-l-lg">Devoir</th>
                <th className="table-header text-left">Module</th>
                <th className="table-header text-left">Date limite</th>
                <th className="table-header text-left">Statut</th>
                <th className="table-header text-left">Note</th>
                <th className="table-header text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} cols={6} />
                ))
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon="📝"
                      title="Aucun devoir"
                      description="Aucun devoir disponible."
                    />
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="table-row-hover">
                    <td className="table-cell font-medium text-slate-800">
                      {a.title}
                    </td>
                    <td className="table-cell">
                      <Badge variant="blue">{a.module_name ?? "—"}</Badge>
                    </td>
                    <td className="table-cell text-slate-500">
                      {a.due_date
                        ? new Date(a.due_date).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="table-cell">
                      {STATUS_BADGE[a.my_submission?.status ?? "pending"]}
                    </td>
                    <td className="table-cell">
                      {a.my_submission?.grade != null ? (
                        <span className="font-bold text-brand-blue">
                          {a.my_submission.grade}/20
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      {!a.my_submission ? (
                        <button
                          onClick={() => {
                            setSelected(a);
                            setSubmit(true);
                          }}
                          className="text-xs text-brand-blue hover:underline font-medium"
                        >
                          Rendre →
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Rendu
                        </span>
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
      <Modal
        open={showSubmit}
        onClose={() => setSubmit(false)}
        title={`Rendre — ${selected?.title ?? ""}`}
      >
        <div className="space-y-4">
          {selected?.description && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              {selected.description}
            </p>
          )}
          <div>
            <label className="label">Fichier à rendre (PDF, ZIP…)</label>
            <input
              type="file"
              className="input"
              accept=".pdf,.zip,.docx,.txt"
              onChange={(e) => {
                if (e.target.files?.[0])
                  submitMutation.mutate(e.target.files[0]);
              }}
            />
          </div>
          {submitMutation.isPending && (
            <p className="text-sm text-brand-blue flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
              Envoi en cours...
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}

export default function Assignments() {
  const { user } = useAuth();
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Pédagogie</span>
              <span>/</span>
              <span className="text-slate-700">Devoirs</span>
            </nav>
            <h1 className="page-title">Devoirs & Exercices</h1>
            <p className="page-subtitle">
              {user?.role === "stagiaire"
                ? "Consultez et rendez vos devoirs"
                : "Créez et évaluez les travaux des stagiaires"}
            </p>
          </div>
        </div>
        {user?.role === "stagiaire" ? <StagiaireView /> : <TeacherView />}
      </div>
    </AppShell>
  );
}

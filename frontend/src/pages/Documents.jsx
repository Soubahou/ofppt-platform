import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import Modal from "../components/ui/Modal.jsx";
import toast from "react-hot-toast";
import AppShell from "../components/layout/AppShell";
import { Badge, Pagination } from "../components/ui/index.jsx";
import { SkeletonRow, EmptyState } from "../components/shared/index.jsx";
import { documentsApi } from "../api/index.js";
import { academicApi } from "../api/academic.api";
import { useAuth } from "../hooks/useAuth";

export default function Documents() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [moduleId, setModule] = useState("");
  const [search, setSearch] = useState("");

  const { data: modules } = useQuery({
    queryKey: ["modules"],
    queryFn: () => academicApi.listModules(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["documents", { page, moduleId, search }],
    queryFn: () =>
      documentsApi.list({ page, module_id: moduleId || undefined, search }),
    keepPreviousData: true,
  });
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: "", type: "resource" });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("type", form.type);
      fd.append("file", file);
      return documentsApi.create(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document ajouté");
      setShowUpload(false);
      setFile(null);
      setForm({ title: "", type: "resource" });
    },
    onError: (err) => toast.error(err.response?.data?.error ?? "Erreur"),
  });

  const docs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Académique</span>
              <span>/</span>
              <span className="text-slate-700">Documents</span>
            </nav>
            <h1 className="page-title">Bibliothèque de Documents</h1>
            <p className="page-subtitle">
              Cours, TPs, corrections et ressources pédagogiques
            </p>
          </div>
          {(user?.role === "formateur" || user?.role === "direction") && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary text-xs"
            >
              + Ajouter un document
            </button>
          )}
        </div>

        <div className="card p-5">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <select
              className="select w-auto"
              value={moduleId}
              onChange={(e) => {
                setModule(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les modules</option>
              {(modules?.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              className="input max-w-xs"
              placeholder="Rechercher un document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left rounded-l-lg">
                    Document
                  </th>
                  <th className="table-header text-left">Module</th>
                  <th className="table-header text-left">Publié par</th>
                  <th className="table-header text-left">Date</th>
                  <th className="table-header text-left">Taille</th>
                  <th className="table-header text-right rounded-r-lg">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon=""
                        title="Aucun document"
                        description="Aucun document disponible pour ces filtres."
                      />
                    </td>
                  </tr>
                ) : (
                  docs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📄</span>
                          <span className="font-medium text-slate-800">
                            {d.title}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <Badge variant="blue">{d.type}</Badge>
                      </td>
                      <td className="table-cell text-slate-500">—</td>
                      <td className="table-cell text-slate-500">
                        {new Date(d.upload_date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="table-cell text-slate-500">—</td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => documentsApi.download(d.id, d.title)}
                          className="text-xs text-brand-blue hover:underline font-medium"
                        >
                          ⬇ Télécharger
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
      </div>
      <Modal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          setFile(null);
        }}
        title="Ajouter un document"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Titre</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="course">Cours</option>
              <option value="exercise">Exercice</option>
              <option value="resource">Ressource</option>
            </select>
          </div>
          <div>
            <label className="label">Fichier</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer ${file ? "border-brand-blue bg-brand-blue-xs" : "border-slate-300 hover:border-brand-blue hover:bg-brand-blue-xs"}`}
            >
              {file ? (
                <p className="text-sm font-semibold text-brand-blue truncate">
                  {file.name}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Cliquez pour choisir un fichier
                </p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={!form.title || !file || uploadMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {uploadMutation.isPending ? "Envoi..." : "Publier"}
            </button>
            <button
              onClick={() => {
                setShowUpload(false);
                setFile(null);
              }}
              className="btn-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

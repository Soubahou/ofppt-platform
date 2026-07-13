import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../hooks/useAuth";
import { usersApi } from "../api/users.api";
import { authApi } from "../api/auth.api";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code: "fr", flag: "FR", label: "Français", native: "Français" },
  { code: "ar", flag: "AR", label: "Arabe", native: "العربية" },
  { code: "en", flag: "EN", label: "Anglais", native: "English" },
];

function Section({ title, children }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-800 text-sm mb-4 pb-3 border-b border-slate-100">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();

  const [lang, setLang] = useState(
    () => localStorage.getItem("ofppt-lang") ?? "fr",
  );
  const [tab, setTab] = useState("info");

  const [infoForm, setInfo] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
  });
  const [pwForm, setPw] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [pwErr, setPwErr] = useState("");

  const updateInfo = useMutation({
    mutationFn: () => usersApi.update(user.id, infoForm),
    onSuccess: () => {
      toast.success("Profil mis à jour");
      if (refreshUser) refreshUser();
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const changePw = useMutation({
    mutationFn: () =>
      authApi.changePassword(pwForm.current_password, pwForm.new_password),
    onSuccess: () => {
      toast.success("Mot de passe modifié");
      setPw({ current_password: "", new_password: "", confirm: "" });
      setPwErr("");
    },
    onError: (err) => toast.error(err.response?.data?.message ?? "Erreur"),
  });

  const handlePwSubmit = () => {
    if (pwForm.new_password !== pwForm.confirm) {
      setPwErr("Les mots de passe ne correspondent pas.");
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwErr("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPwErr("");
    changePw.mutate();
  };

  const handleLangChange = (code) => {
    setLang(code);
    localStorage.setItem("ofppt-lang", code);
    toast.success(
      `Langue changée en ${LANGUAGES.find((l) => l.code === code)?.label}`,
    );
  };

  const ROLE_LABEL = {
    direction: "Direction",
    formateur: "Formateur",
    stagiaire: "Stagiaire",
  };

  const TABS = [
    { id: "info", icon: "👤", label: "Informations" },
    { id: "pw", icon: "🔐", label: "Mot de passe" },
    { id: "lang", icon: "🌐", label: "Langue" },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Compte</span>
              <span>/</span>
              <span className="text-slate-700">Mon Profil</span>
            </nav>
            <h1 className="page-title">Mon Profil</h1>
          </div>
        </div>

        <div className="card p-5 mb-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-blue text-white text-xl font-black flex items-center justify-center flex-shrink-0 shadow-md">
            {user?.first_name?.[0]}
            {user?.last_name?.[0]}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full mt-1 inline-block">
              {ROLE_LABEL[user?.role] ?? user?.role}
            </span>
          </div>
        </div>

        <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === t.id
                  ? "bg-brand-blue text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === "info" && (
          <Section title="Informations personnelles">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input readOnly
                    className="input"
                    value={infoForm.first_name}
                    onChange={(e) =>
                      setInfo((f) => ({ ...f, first_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input readOnly
                    className="input"
                    value={infoForm.last_name}
                    onChange={(e) =>
                      setInfo((f) => ({ ...f, last_name: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={user?.email ?? ""}
                  readOnly
                />
              </div>
              <button
                onClick={() => updateInfo.mutate()}
                disabled={updateInfo.isPending}
                className="btn-primary"
              >
                {updateInfo.isPending
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>
            </div>
          </Section>
        )}

        {tab === "pw" && (
          <Section title="Modifier le mot de passe">
            <div className="space-y-4">
              <div>
                <label className="label">Mot de passe actuel</label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.current_password}
                  onChange={(e) =>
                    setPw((f) => ({ ...f, current_password: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.new_password}
                  onChange={(e) =>
                    setPw((f) => ({ ...f, new_password: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  className="input"
                  value={pwForm.confirm}
                  onChange={(e) =>
                    setPw((f) => ({ ...f, confirm: e.target.value }))
                  }
                />
              </div>
              {pwErr && (
                <p className="text-xs text-red-500 font-medium">{pwErr}</p>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">
                  Conseils de sécurité :
                </p>
                <ul className="text-xs text-amber-600 mt-1 space-y-0.5 list-disc list-inside">
                  <li>Au moins 8 caractères</li>
                  <li>Mélangez lettres majuscules, minuscules, chiffres</li>
                  <li>Évitez les informations personnelles</li>
                </ul>
              </div>
              <button
                onClick={handlePwSubmit}
                disabled={
                  !pwForm.current_password ||
                  !pwForm.new_password ||
                  changePw.isPending
                }
                className="btn-primary"
              >
                {changePw.isPending
                  ? "Modification..."
                  : "Modifier le mot de passe"}
              </button>
            </div>
          </Section>
        )}

        {tab === "lang" && (
          <Section title="Langue de l'interface">
            <div className="space-y-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLangChange(l.code)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left active:scale-[0.99] ${
                    lang === l.code
                      ? "border-brand-blue bg-brand-blue-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <span className="text-3xl flex-shrink-0">{l.flag}</span>
                  <div>
                    <p
                      className={`font-semibold text-sm ${lang === l.code ? "text-brand-blue" : "text-slate-800"}`}
                    >
                      {l.label}
                    </p>
                    <p className="text-xs text-slate-500">{l.native}</p>
                  </div>
                  {lang === l.code && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-bold">
                        ✓
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              La préférence de langue est enregistrée localement. La traduction
              complète sera disponible prochainement.
            </p>
          </Section>
        )}
      </div>
    </AppShell>
  );
}

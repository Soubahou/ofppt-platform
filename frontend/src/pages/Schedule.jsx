import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../hooks/useAuth";
import { useSchedule } from "../hooks/useSchedule";
import { SLOTS, DAYS, ROW_HEIGHT } from "../constants/schedule";
import { EmptyState } from "../components/shared/index.jsx";
import { academicApi } from "../api/academic.api";

const MODULE_COLORS = [
  {
    bg: "bg-blue-50",
    border: "border-blue-300",
    badge: "bg-blue-500",
    text: "text-blue-800",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-300",
    badge: "bg-orange-500",
    text: "text-orange-800",
  },
  {
    bg: "bg-green-50",
    border: "border-green-300",
    badge: "bg-green-500",
    text: "text-green-800",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-300",
    badge: "bg-purple-500",
    text: "text-purple-800",
  },
  {
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-500",
    text: "text-red-800",
  },
  {
    bg: "bg-teal-50",
    border: "border-teal-300",
    badge: "bg-teal-500",
    text: "text-teal-800",
  },
];

function SessionBlock({ session, colorIdx = 0 }) {
  const c = MODULE_COLORS[colorIdx % MODULE_COLORS.length];
  return (
    <div
      className={`p-1.5 rounded-lg border ${c.bg} ${c.border} h-full overflow-hidden transition-all duration-150 hover:shadow-sm`}
    >
      <div
        className={`text-white text-[9px] font-bold px-1.5 py-0.5 rounded ${c.badge} inline-block mb-1 truncate max-w-full`}
      >
        {session.module_code || "MOD"}
      </div>
      <p
        className={`font-semibold text-[11px] ${c.text} truncate leading-tight`}
      >
        {session.module_name}
      </p>
      {session.room && (
        <p className="text-[10px] text-slate-500 truncate mt-0.5">
          🏫 {session.room}
        </p>
      )}
    </div>
  );
}

function WeeklyGrid({ sessions = [] }) {
  // Build occupation map so background cells know they're covered
  const grid = {};
  sessions.forEach((s) => {
    if (s.day_of_week != null && s.start_slot != null) {
      for (let i = 0; i < (s.slot_count ?? 1); i++) {
        grid[`${s.day_of_week}-${s.start_slot + i}`] = i === 0 ? s : "span";
      }
    }
  });

  const moduleColors = {};
  let ci = 0;
  sessions.forEach((s) => {
    const mid =
      s.module_id ?? s.module_teacher_group?.module_teacher?.module_id;
    if (mid != null && !(mid in moduleColors)) moduleColors[mid] = ci++;
  });
  const moduleId = (s) =>
    s.module_id ?? s.module_teacher_group?.module_teacher?.module_id;
  const colorIdx = (s) => moduleColors[moduleId(s)] ?? 0;

  return (
    <div className="overflow-x-auto">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "72px repeat(5, 1fr)",
          gridTemplateRows: `38px repeat(${SLOTS.length}, ${ROW_HEIGHT}px)`,
          minWidth: 680,
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
            className="flex items-center justify-center text-[9px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-1 text-center leading-tight"
          >
            {slot.label}
          </div>
        ))}

        {/* Background cells */}
        {SLOTS.map((_, si) =>
          DAYS.map((_, di) => {
            const occupied = !!grid[`${di}-${si}`];
            return (
              <div
                key={`${di}-${si}`}
                style={{ gridColumn: di + 2, gridRow: si + 2 }}
                className={`border border-slate-200/60 ${occupied ? "" : "bg-white hover:bg-slate-50/60"}`}
              />
            );
          }),
        )}

        {/* Sessions — span N rows via CSS grid */}
        {sessions.map((s) => {
          if (s.day_of_week == null || s.start_slot == null) return null;
          return (
            <div
              key={s.id}
              style={{
                gridColumn: s.day_of_week + 2,
                gridRow: `${s.start_slot + 2} / span ${s.slot_count ?? 1}`,
                zIndex: 10,
                padding: "2px",
              }}
            >
              <SessionBlock session={s} colorIdx={colorIdx(s)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
};

const getWeekLabel = (weekStart) => {
  const currentMonday = getMonday(new Date());
  const diff = Math.round((weekStart - currentMonday) / (7 * 86400000));
  if (diff === -1)
    return {
      main: "Semaine précédente",
      sub: weekStart.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      }),
    };
  if (diff === 0)
    return {
      main: "Cette semaine",
      sub: weekStart.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      }),
    };
  if (diff === 1)
    return {
      main: "Semaine prochaine",
      sub: weekStart.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      }),
    };
  return {
    main: `Semaine du ${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`,
    sub: weekStart.getFullYear(),
  };
};

export default function Schedule() {
  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [search, setSearch] = useState("");

  const isDirection = user?.role === "direction";
  const isFormateur = user?.role === "formateur";

  const { data: groupsData } = useQuery({
    queryKey: ["groups"],
    queryFn: () => academicApi.listGroups({ limit: 100 }),
    enabled: isDirection,
  });

  const isStagiaire = user?.role === "stagiaire";
  const groupId = isDirection ? selectedGroupId : null;
  const userId = isFormateur || isStagiaire ? user?.id : null;

  const { weekStart, prevWeek, nextWeek, goToToday, sessions, isLoading } =
    useSchedule({ groupId, userId });

  const allGroups = groupsData?.data ?? [];
  const filteredGroups = allGroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );
  const weekLabel = getWeekLabel(weekStart);

  return (
    <AppShell>
      <div className="max-w-full">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <span>Académique</span>
              <span>/</span>
              <span className="text-slate-700">Emploi du Temps</span>
            </nav>
            <h1 className="page-title">Emploi du Temps</h1>
            <p className="page-subtitle">Calendrier hebdomadaire des séances</p>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          <div className="flex-1 min-w-0 card p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevWeek}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  ← Préc.
                </button>
                <button
                  onClick={goToToday}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={nextWeek}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Suiv. →
                </button>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">
                  {weekLabel.main}
                </p>
                <p className="text-xs text-slate-500">
                  Semaine du {weekLabel.sub}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-blue rounded-full animate-spin" />
              </div>
            ) : !groupId && !userId ? (
              <EmptyState
                icon="📅"
                title="Sélectionnez un groupe"
                description="Choisissez un groupe dans le panneau à droite pour afficher son emploi du temps."
              />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon="📭"
                title="Aucune séance programmée"
                description="Aucune séance n'est planifiée pour cette semaine."
              />
            ) : (
              <WeeklyGrid sessions={sessions} />
            )}
          </div>

          {isDirection && (
            <div className="w-64 flex-shrink-0 card p-3 fade-in">
              <h3 className="font-bold text-slate-700 text-sm mb-2 px-1">
                Groupes
              </h3>
              <input
                type="text"
                placeholder="Rechercher un groupe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input text-xs mb-2"
              />
              <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto pr-0.5">
                {filteredGroups.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Aucun groupe trouvé
                  </p>
                ) : (
                  filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`group-block ${selectedGroupId === g.id ? "selected" : "unselected"}`}
                    >
                      <p
                        className={`text-sm font-semibold ${selectedGroupId === g.id ? "text-brand-blue" : "text-slate-700"}`}
                      >
                        {g.name}
                      </p>
                      {g.branch_name && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {g.branch_name}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

import { useState, useEffect, useCallback } from "react";
import { PointsCounter } from "../components/PointsCounter";
import { RoutineSection } from "../components/RoutineSection";
import { DaySummary } from "../components/DaySummary";

// Types exported for use in components
export interface Completion {
  id: string;
  value: number;
  comment?: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  icon: string;
  points: number;
  type: "binary" | "incremental";
  scheduledTime: string | null;
  sortOrder: number;
  completions: Completion[];
}

export interface Routine {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  activities: Activity[];
}

interface PanelData {
  diary: { id: string; name: string; avatar: string };
  date: string;
  dayOfWeek: number;
  routines: Routine[];
  totalPoints: number;
  note: string;
}

const DAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function isRoutineComplete(routine: Routine): boolean {
  const binaryActivities = routine.activities.filter(
    (a) => a.type === "binary"
  );
  if (binaryActivities.length === 0) return true;
  return binaryActivities.every((a) => a.completions.length > 0);
}

export default function Painel() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingRoutineId, setViewingRoutineId] = useState<string | null>(null);

  // Read token from hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    if (match) {
      setToken(match[1]);
    } else {
      setError("Token de acesso não encontrado na URL");
      setLoading(false);
    }
  }, []);

  const fetchData = useCallback(
    async (date?: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const url = date
          ? `/api/painel?date=${date}`
          : "/api/painel";
        const res = await fetch(url, {
          headers: { "X-Access-Token": token },
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error || "Erro ao carregar dados");
        }
        const json = (await res.json()) as PanelData;
        setData(json);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Fetch data when token is available
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  function navigateDay(offset: number) {
    if (!data) return;
    const current = new Date(data.date + "T12:00:00Z");
    current.setUTCDate(current.getUTCDate() + offset);
    const newDate = current.toISOString().split("T")[0];
    setViewingRoutineId(null);
    fetchData(newDate);
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <span className="text-4xl block mb-3">😕</span>
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Ops!
          </p>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Find the current active routine: first one not yet complete, or last if all done
  const routinesWithActivities = data.routines.filter(
    (r) => r.activities.length > 0
  );

  let activeRoutine: Routine | null = null;
  for (let i = 0; i < routinesWithActivities.length; i++) {
    if (!isRoutineComplete(routinesWithActivities[i])) {
      activeRoutine = routinesWithActivities[i];
      break;
    }
  }
  if (!activeRoutine && routinesWithActivities.length > 0) {
    activeRoutine = routinesWithActivities[routinesWithActivities.length - 1];
  }

  const allComplete = routinesWithActivities.every(isRoutineComplete);

  const showingSummary = viewingRoutineId === "__summary__";

  // If user clicked a pill, show that routine; otherwise show the active one
  const viewingRoutine = showingSummary
    ? null
    : viewingRoutineId
      ? routinesWithActivities.find((r) => r.id === viewingRoutineId) ?? activeRoutine
      : activeRoutine;

  function handleComplete() {
    // Reset to auto (active routine) so it advances naturally
    setViewingRoutineId(null);
    fetchData(data!.date);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{data.diary.avatar}</span>
              <h1 className="text-lg font-bold text-gray-800">
                {data.diary.name}
              </h1>
            </div>
            <PointsCounter points={data.totalPoints} />
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDay(-1)}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              aria-label="Dia anterior"
            >
              <span className="text-gray-600 text-lg">‹</span>
            </button>
            <div className="text-center">
              <p className="font-semibold text-gray-800">
                {DAY_NAMES[data.dayOfWeek]}
              </p>
              <p className="text-sm text-gray-500">
                {formatDate(data.date)}
              </p>
            </div>
            <button
              onClick={() => navigateDay(1)}
              className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              aria-label="Próximo dia"
            >
              <span className="text-gray-600 text-lg">›</span>
            </button>
          </div>
        </div>
      </header>

      {/* Routine progress indicators */}
      {routinesWithActivities.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {routinesWithActivities.map((r) => {
              const complete = isRoutineComplete(r);
              const isViewing = !showingSummary && r.id === viewingRoutine?.id;
              return (
                <button
                  key={r.id}
                  onClick={() =>
                    setViewingRoutineId(r.id === activeRoutine?.id ? null : r.id)
                  }
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-manipulation ${
                    isViewing
                      ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300"
                      : complete
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.name}</span>
                  {complete && <span>✓</span>}
                </button>
              );
            })}
            <button
              onClick={() => setViewingRoutineId("__summary__")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all touch-manipulation ${
                showingSummary
                  ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span>📋</span>
              <span>Resumo</span>
            </button>
          </div>
        </div>
      )}

      {/* Current routine */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {showingSummary ? (
          <DaySummary
            routines={routinesWithActivities}
            totalPoints={data.totalPoints}
            note={data.note}
            date={data.date}
            token={token!}
            onNoteSaved={() => fetchData(data.date)}
          />
        ) : !viewingRoutine ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-gray-500">
              Nenhuma atividade para este dia
            </p>
          </div>
        ) : (
          <>
            {allComplete && (
              <div className="text-center py-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-3xl block mb-1">🎉</span>
                <p className="font-semibold text-emerald-700">
                  Todas as rotinas completas!
                </p>
              </div>
            )}
            <RoutineSection
              key={viewingRoutine.id}
              routine={viewingRoutine}
              date={data.date}
              token={token!}
              onComplete={handleComplete}
            />
          </>
        )}
      </main>

      {/* Loading overlay for refetch */}
      {loading && data && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-20">
          <div className="animate-spin h-6 w-6 border-3 border-violet-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import type { Routine } from "../routes/painel";

interface Props {
  routines: Routine[];
  totalPoints: number;
  note: string;
  date: string;
  token: string;
  onNoteSaved: () => void;
}

export function DaySummary({ routines, totalPoints, note, date, token, onNoteSaved }: Props) {
  const allBinary = routines.flatMap((r) =>
    r.activities.filter((a) => a.type === "binary")
  );
  const completedBinary = allBinary.filter((a) => a.completions.length > 0);
  const doneBinary = allBinary.filter(
    (a) => a.completions.length > 0 && a.completions[0].value > 0
  );

  const [noteText, setNoteText] = useState(note);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync note text when prop changes (e.g. navigating days)
  useEffect(() => {
    setNoteText(note);
    setSaved(false);
  }, [note, date]);

  const hasChanges = noteText !== note;

  async function handleSaveNote() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/painel/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Token": token,
        },
        body: JSON.stringify({ date, content: noteText }),
      });
      if (res.ok) {
        setSaved(true);
        onNoteSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header do resumo */}
      <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-violet-500 font-medium">Pontos do dia</p>
            <p className="text-2xl font-bold text-violet-700">
              {totalPoints > 0 ? "+" : ""}
              {totalPoints} pts
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-violet-500 font-medium">Progresso</p>
            <p className="text-2xl font-bold text-violet-700">
              {completedBinary.length}/{allBinary.length}
            </p>
          </div>
        </div>
        {allBinary.length > 0 && (
          <div className="mt-2 h-2 bg-violet-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{
                width: `${(completedBinary.length / allBinary.length) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Rotinas */}
      {routines.map((routine) => (
        <div key={routine.id} className="space-y-1">
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">{routine.icon}</span>
            <h3 className="text-base font-bold text-gray-700">{routine.name}</h3>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {routine.activities.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">
                Nenhuma atividade
              </p>
            ) : (
              routine.activities.map((activity) => {
                const isBinary = activity.type === "binary";
                const completion = activity.completions[0];
                const isCompleted = isBinary && !!completion;
                const didIt = isCompleted && completion.value > 0;

                // Incremental stats
                const incTotal = activity.completions.reduce(
                  (s, c) => s + c.value,
                  0
                );
                const incCount = activity.completions.length;

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    {/* Activity icon + status */}
                    <span className="text-lg shrink-0">
                      {activity.icon
                        ? activity.icon
                        : isBinary
                          ? isCompleted
                            ? didIt
                              ? "✅"
                              : "❌"
                            : "⬜"
                          : "📊"}
                    </span>

                    {/* Activity info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isCompleted
                            ? "line-through text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        {activity.scheduledTime && (
                          <span className="text-violet-400 font-normal">
                            {activity.scheduledTime} ·{" "}
                          </span>
                        )}
                        {activity.title}
                      </p>
                    </div>

                    {/* Points/status badge */}
                    {isBinary ? (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isCompleted
                            ? didIt
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {isCompleted
                          ? didIt
                            ? `+${activity.points}`
                            : `-${activity.points}`
                          : "pendente"}
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          incCount > 0
                            ? "bg-violet-100 text-violet-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {incCount > 0
                          ? `${incTotal > 0 ? "+" : ""}${incTotal} (${incCount}x)`
                          : "sem registro"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}

      {/* Observações do dia */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-1">
          <span className="text-lg">📝</span>
          <h3 className="text-base font-bold text-gray-700">Observações do dia</h3>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setSaved(false);
            }}
            placeholder="Anote observações sobre o dia..."
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {saved ? "✓ Salvo" : hasChanges ? "Alterações não salvas" : ""}
            </span>
            <button
              onClick={handleSaveNote}
              disabled={saving || !hasChanges}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all touch-manipulation ${
                saving || !hasChanges
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-violet-500 text-white hover:bg-violet-600 active:bg-violet-700"
              }`}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

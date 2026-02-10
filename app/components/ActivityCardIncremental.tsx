import { useState, useRef, useEffect } from "react";
import type { Activity } from "../routes/painel";

interface Props {
  activity: Activity;
  date: string;
  token: string;
  onComplete: () => void;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function ActivityCardIncremental({
  activity,
  date,
  token,
  onComplete,
}: Props) {
  const totalValue = activity.completions.reduce((s, c) => s + c.value, 0);
  const clickCount = activity.completions.length;

  const [pendingPositive, setPendingPositive] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOpen = pendingPositive !== null;

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  function openPopup(positive: boolean) {
    setPendingPositive(positive);
    setComment("");
  }

  function closePopup() {
    setPendingPositive(null);
    setComment("");
  }

  async function handleConfirm() {
    if (pendingPositive === null) return;
    setSubmitting(true);
    const value = pendingPositive ? activity.points : -activity.points;
    await fetch("/api/painel/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": token,
      },
      body: JSON.stringify({
        activityId: activity.id,
        date,
        value,
        comment: comment.trim() || undefined,
      }),
    });
    setSubmitting(false);
    closePopup();
    onComplete();
  }

  return (
    <>
      <div className="rounded-2xl border-2 border-gray-300 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {activity.icon && (
            <span className="text-2xl shrink-0">{activity.icon}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-800 truncate">
              {activity.title}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {activity.scheduledTime && (
                <span className="text-violet-400">{activity.scheduledTime} · </span>
              )}
              {activity.points} pontos
              {clickCount > 0 && (
                <span className="text-violet-600 font-semibold ml-1.5">
                  {totalValue > 0 ? "+" : ""}{totalValue} pts ({clickCount}x)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openPopup(true)}
              className="h-9 w-9 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 flex items-center justify-center text-white text-lg font-bold transition-all touch-manipulation"
              aria-label="Adicionar pontos"
            >
              +
            </button>
            <button
              onClick={() => openPopup(false)}
              className="h-9 w-9 rounded-full bg-red-700 hover:bg-red-800 active:scale-95 flex items-center justify-center text-white text-lg font-bold transition-all touch-manipulation"
              aria-label="Remover pontos"
            >
              −
            </button>
          </div>
        </div>

        {/* Log de registros */}
        {clickCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            {activity.completions.map((c) => (
              <div key={c.id}>
                <div className="flex items-center gap-2 text-sm tabular-nums font-mono">
                  <span className="text-gray-400">{formatTime(c.createdAt)}</span>
                  <span className="text-gray-300">|</span>
                  <span
                    className={
                      c.value > 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"
                    }
                  >
                    {c.value > 0 ? "+" : "−"}
                  </span>
                  {c.comment && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500 font-sans text-xs truncate">
                        {c.comment}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popup de comentario */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closePopup}
        >
          <div
            className="bg-white rounded-2xl shadow-lg p-5 max-w-sm w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-gray-800">
              Registrar{" "}
              <span className={pendingPositive ? "text-emerald-600" : "text-red-500"}>
                {pendingPositive ? `+${activity.points}` : `−${activity.points}`}
              </span>{" "}
              em {activity.title}
            </p>

            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentário (opcional)"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm"
            />

            <div className="flex gap-3">
              <button
                onClick={closePopup}
                disabled={submitting}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors"
              >
                {submitting ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

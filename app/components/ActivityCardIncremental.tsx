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

  async function handleClick(positive: boolean) {
    const value = positive ? activity.points : -activity.points;
    await fetch("/api/painel/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": token,
      },
      body: JSON.stringify({ activityId: activity.id, date, value }),
    });
    onComplete();
  }

  return (
    <div className="rounded-2xl border-2 border-gray-300 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-800 truncate">
            {activity.scheduledTime && (
              <span className="text-sm text-violet-400 font-normal">{activity.scheduledTime} · </span>
            )}
            {activity.title} ({activity.points} pontos)
          </p>
          {clickCount > 0 && (
            <p className="text-sm text-violet-600 font-semibold tabular-nums">
              {totalValue > 0 ? "+" : ""}
              {totalValue} pts ({clickCount}x)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleClick(true)}
            className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 flex items-center justify-center text-white text-2xl font-bold transition-all touch-manipulation"
            aria-label="Adicionar pontos"
          >
            +
          </button>
          <button
            onClick={() => handleClick(false)}
            className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 flex items-center justify-center text-white text-2xl font-bold transition-all touch-manipulation"
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
            <div
              key={c.id}
              className="flex items-center gap-2 text-sm tabular-nums font-mono"
            >
              <span className="text-gray-400">{formatTime(c.createdAt)}</span>
              <span className="text-gray-300">|</span>
              <span
                className={
                  c.value > 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"
                }
              >
                {c.value > 0 ? "+" : "−"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

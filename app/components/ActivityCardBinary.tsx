import type { Activity } from "../routes/painel";

interface Props {
  activity: Activity;
  date: string;
  token: string;
  onComplete: () => void;
}

export function ActivityCardBinary({
  activity,
  date,
  token,
  onComplete,
}: Props) {
  const completion = activity.completions[0];
  const isCompleted = !!completion;
  const didIt = isCompleted && completion.value > 0;
  const isSkipped = isCompleted && completion.value === 0;

  async function handleMark(value: number) {
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
    <div
      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${
        isCompleted
          ? isSkipped
            ? "border-gray-200 bg-gray-100/60"
            : didIt
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-red-200 bg-red-50/60"
          : "border-gray-300 bg-white"
      }`}
    >
      {activity.icon && (
        <span className="text-2xl shrink-0">{activity.icon}</span>
      )}
      <p
        className={`flex-1 text-base font-medium min-w-0 truncate transition-all ${
          isCompleted ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {activity.scheduledTime && (
          <span className="text-sm text-violet-400 font-normal">{activity.scheduledTime} · </span>
        )}
        {activity.title} ({activity.points} pontos)
      </p>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handleMark(activity.points)}
          className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl transition-all touch-manipulation ${
            isCompleted
              ? didIt
                ? "bg-emerald-500 ring-2 ring-emerald-300"
                : "bg-gray-300 opacity-50"
              : "bg-emerald-500 hover:bg-emerald-600 active:scale-95"
          }`}
          aria-label="Fiz"
        >
          👍
        </button>
        <button
          onClick={() => handleMark(-activity.points)}
          className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl transition-all touch-manipulation ${
            isCompleted
              ? !didIt && !isSkipped
                ? "bg-red-500 ring-2 ring-red-300"
                : "bg-gray-300 opacity-50"
              : "bg-red-500 hover:bg-red-600 active:scale-95"
          }`}
          aria-label="Não fiz"
        >
          👎
        </button>
        {!isSkipped && (
          <button
            onClick={() => handleMark(0)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors touch-manipulation px-1"
            aria-label="Pular"
          >
            pular
          </button>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
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

  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  async function handleMark(value: number) {
    setIsOpen(false);
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
        ...(activity.isExtra && { isExtra: true }),
      }),
    });
    onComplete();
  }

  // Badge for completed state (shown when card is closed)
  const statusBadge = isCompleted && !isOpen && (
    <span
      className={`shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full text-sm ${
        isSkipped
          ? "bg-gray-300"
          : didIt
            ? "bg-emerald-600"
            : "bg-red-600"
      }`}
    >
      {isSkipped ? "➖" : didIt ? "👍" : "👎"}
    </span>
  );

  return (
    <div
      ref={cardRef}
      onClick={() => !isOpen && setIsOpen(true)}
      className={`rounded-2xl border-2 px-4 py-3 transition-all ${
        isCompleted
          ? isSkipped
            ? "border-gray-200 bg-gray-100/60"
            : didIt
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-red-200 bg-red-50/60"
          : "border-gray-300 bg-white"
      } ${!isOpen ? "cursor-pointer active:scale-[0.98]" : ""}`}
    >
      {/* Main row: icon + title/details + status badge */}
      <div className="flex items-center gap-3">
        {activity.icon && (
          <span className="text-2xl shrink-0">{activity.icon}</span>
        )}
        <div className={`flex-1 min-w-0 ${isOpen ? "" : "[&>p:first-child]:truncate"}`}>
          <p
            className={`text-base font-medium transition-all ${
              isCompleted && !isOpen ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {activity.title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {activity.scheduledTime && (
              <span className="text-violet-400">{activity.scheduledTime} · </span>
            )}
            {activity.points} pontos
          </p>
        </div>
        {statusBadge}
      </div>

      {/* Action buttons (revealed on tap) */}
      {isOpen && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMark(activity.points || 1);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-medium text-sm transition-all touch-manipulation"
          >
            👍 Fiz
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMark(-(activity.points || 1));
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 active:scale-95 text-white font-medium text-sm transition-all touch-manipulation"
          >
            👎 Não fiz
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMark(0);
            }}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-500 font-medium text-sm transition-all touch-manipulation"
          >
            Pular
          </button>
        </div>
      )}
    </div>
  );
}

export function PointsCounter({ points }: { points: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
      <span className="text-xl">⭐</span>
      <span
        className={`text-2xl font-bold tabular-nums ${
          points > 0
            ? "text-amber-600"
            : points < 0
              ? "text-red-500"
              : "text-gray-500"
        }`}
      >
        {points}
      </span>
      <span className="text-xs text-amber-700 font-medium">pts</span>
    </div>
  );
}

import type { Routine } from "../routes/painel";
import { ActivityCardBinary } from "./ActivityCardBinary";
import { ActivityCardIncremental } from "./ActivityCardIncremental";

interface Props {
  routine: Routine;
  date: string;
  token: string;
  onComplete: () => void;
}

export function RoutineSection({
  routine,
  date,
  token,
  onComplete,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-2xl">{routine.icon}</span>
        <h2 className="text-xl font-bold text-gray-800">{routine.name}</h2>
        <RoutineProgress routine={routine} />
      </div>

      <div className="space-y-3">
        {routine.activities.map((activity) =>
          activity.type === "binary" ? (
            <ActivityCardBinary
              key={activity.id}
              activity={activity}
              date={date}
              token={token}
              onComplete={onComplete}
            />
          ) : (
            <ActivityCardIncremental
              key={activity.id}
              activity={activity}
              date={date}
              token={token}
              onComplete={onComplete}
            />
          )
        )}
      </div>
    </div>
  );
}

function RoutineProgress({ routine }: { routine: Routine }) {
  const binaryActivities = routine.activities.filter(
    (a) => a.type === "binary"
  );
  const completedBinary = binaryActivities.filter(
    (a) => a.completions.length > 0
  );

  if (binaryActivities.length === 0) return null;

  const allDone = completedBinary.length === binaryActivities.length;

  return (
    <span
      className={`ml-auto text-sm font-medium px-2 py-0.5 rounded-full ${
        allDone
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {completedBinary.length}/{binaryActivities.length}
    </span>
  );
}

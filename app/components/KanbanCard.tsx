import { Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router";

export interface ActivityData {
  id: string;
  title: string;
  icon: string | null;
  points: number;
  type: "binary" | "incremental";
  scheduledTime: string | null;
}

interface KanbanCardProps {
  activity: ActivityData;
  index: number;
  dayOfWeek: number;
  editUrl: string;
}

export default function KanbanCard({
  activity,
  index,
  dayOfWeek,
  editUrl,
}: KanbanCardProps) {
  return (
    <Draggable
      draggableId={`${activity.id}-day-${dayOfWeek}`}
      index={index}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg p-3 shadow-sm border text-sm transition-shadow ${
            snapshot.isDragging
              ? "shadow-lg ring-2 ring-violet-300 border-violet-200"
              : "border-gray-100"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">
              {activity.icon || "📌"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-semibold text-violet-600">
                  {activity.points}pts
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activity.type === "binary"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {activity.type === "binary" ? "Fiz/Não" : "±"}
                </span>
              </div>
              {activity.scheduledTime && (
                <p className="text-xs text-gray-400 mt-1">
                  🕐 {activity.scheduledTime}
                </p>
              )}
            </div>
          </div>
          <Link
            to={editUrl}
            className="block text-xs text-gray-400 hover:text-violet-600 mt-2 text-right transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Editar
          </Link>
        </div>
      )}
    </Draggable>
  );
}

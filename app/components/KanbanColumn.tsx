import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import type { ActivityData } from "./KanbanCard";

interface KanbanColumnProps {
  dayOfWeek: number;
  dayLabel: string;
  activities: ActivityData[];
  diarioId: string;
  rotinaId: string;
}

export default function KanbanColumn({
  dayOfWeek,
  dayLabel,
  activities,
  diarioId,
  rotinaId,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-40 bg-gray-50 rounded-xl p-3">
      <h3 className="text-sm font-bold text-gray-600 text-center mb-3">
        {dayLabel}
      </h3>
      <Droppable droppableId={`day-${dayOfWeek}`}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 min-h-[80px] rounded-lg p-1 transition-colors ${
              snapshot.isDraggingOver ? "bg-violet-50" : ""
            }`}
          >
            {activities.map((activity, index) => (
              <KanbanCard
                key={activity.id}
                activity={activity}
                index={index}
                dayOfWeek={dayOfWeek}
                editUrl={`/diarios/${diarioId}/rotinas/${rotinaId}/atividades/${activity.id}/editar`}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {activities.length === 0 && (
        <p className="text-xs text-gray-400 text-center mt-2">Vazio</p>
      )}
    </div>
  );
}

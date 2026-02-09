import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useState } from "react";
import { useFetcher } from "react-router";
import KanbanColumn from "./KanbanColumn";
import type { ActivityData } from "./KanbanCard";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

interface KanbanBoardProps {
  columns: Record<number, ActivityData[]>;
  diarioId: string;
  rotinaId: string;
}

export default function KanbanBoard({
  columns: initialColumns,
  diarioId,
  rotinaId,
}: KanbanBoardProps) {
  const [columns, setColumns] = useState(initialColumns);
  const fetcher = useFetcher();

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId !== destination.droppableId) return;
    if (source.index === destination.index) return;

    const dayOfWeek = Number(source.droppableId.replace("day-", ""));
    const items = Array.from(columns[dayOfWeek] || []);
    const [removed] = items.splice(source.index, 1);
    items.splice(destination.index, 0, removed);

    // Optimistic update
    setColumns((prev) => ({ ...prev, [dayOfWeek]: items }));

    // Submit reorder to server
    fetcher.submit(
      {
        intent: "reorder",
        dayOfWeek: String(dayOfWeek),
        activityIds: JSON.stringify(items.map((a) => a.id)),
      },
      { method: "post" }
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {DAY_ORDER.map((day) => (
          <KanbanColumn
            key={day}
            dayOfWeek={day}
            dayLabel={DAY_LABELS[day]}
            activities={columns[day] || []}
            diarioId={diarioId}
            rotinaId={rotinaId}
          />
        ))}
      </div>
    </DragDropContext>
  );
}

"use client";

import { useState, type ReactNode } from "react";

// Small HTML5 drag-and-drop vertical sorter. The admin de carta is a
// desktop-only screen (per the brief), so native DnD is enough and keeps this
// free of pointer-math. `onReorder` gets the full new id order.
export default function SortableList<T extends { id: string }>({
  items,
  onReorder,
  disabled = false,
  renderItem,
  itemClassName = "",
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  disabled?: boolean;
  renderItem: (item: T, dragging: boolean) => ReactNode;
  itemClassName?: string;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function reset() {
    setDragId(null);
    setOverId(null);
  }

  function drop() {
    if (dragId && overId && dragId !== overId) {
      const ids = items.map((i) => i.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(overId);
      if (from !== -1 && to !== -1) {
        ids.splice(from, 1);
        ids.splice(to, 0, dragId);
        onReorder(ids);
      }
    }
    reset();
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const dragging = dragId === item.id;
        const isOver = overId === item.id && dragId !== item.id;
        return (
          <li
            key={item.id}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragId(item.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnter={() => dragId && setOverId(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={reset}
            onDrop={drop}
            className={`${itemClassName} transition-colors ${dragging ? "opacity-40" : ""} ${
              isOver ? "border-t-2 !border-t-accent-400" : ""
            } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
          >
            {renderItem(item, dragging)}
          </li>
        );
      })}
    </ul>
  );
}

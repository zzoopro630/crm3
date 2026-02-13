import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ImageIcon,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDashboardCards,
  useCreateDashboardCard,
  useUpdateDashboardCard,
  useDeleteDashboardCard,
  useReorderDashboardCards,
} from "@/hooks/useDashboardCards";
import { useIsEditor } from "@/hooks/useMenuRole";
import { DashboardCardEditor } from "@/components/dashboard/DashboardCardEditor";
import type { DashboardCard, DashboardCardInput } from "@/types/dashboardCard";

function SortableCard({
  card,
  isEditor,
  onEdit,
  onDelete,
  onClick,
}: {
  card: DashboardCard;
  isEditor: boolean;
  onEdit: (e: React.MouseEvent, card: DashboardCard) => void;
  onDelete: (e: React.MouseEvent, card: DashboardCard) => void;
  onClick: (card: DashboardCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900 transition-shadow hover:shadow-lg ${
        card.linkUrl ? "cursor-pointer" : ""
      }`}
      onClick={() => onClick(card)}
    >
      {/* drag handle — editor만 표시 */}
      {isEditor && (
        <button
          type="button"
          className="absolute top-2 left-2 z-10 p-1 rounded bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-zinc-400" />
        </button>
      )}

      {/* 이미지 영역 */}
      <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt={card.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          </div>
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="p-4">
        <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
          {card.title}
        </h3>
        {card.description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {card.description}
          </p>
        )}
      </div>

      {/* editor 전용: 수정/삭제 버튼 */}
      {isEditor && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
            onClick={(e) => onEdit(e, card)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
            onClick={(e) => onDelete(e, card)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: cards, isLoading, error } = useDashboardCards();
  const isEditor = useIsEditor("/");

  const createMutation = useCreateDashboardCard();
  const updateMutation = useUpdateDashboardCard();
  const deleteMutation = useDeleteDashboardCard();
  const reorderMutation = useReorderDashboardCards();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<DashboardCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  function handleCardClick(card: DashboardCard) {
    if (!card.linkUrl) return;

    // "/" 시작 → 내부 라우트
    if (card.linkUrl.startsWith("/")) {
      navigate(card.linkUrl);
      return;
    }

    // 절대 URL인 경우 호스트 비교
    try {
      const url = new URL(card.linkUrl);
      if (url.hostname === window.location.hostname) {
        navigate(url.pathname + url.search + url.hash);
        return;
      }
    } catch {
      // invalid URL → 내부 경로로 시도
      navigate(card.linkUrl);
      return;
    }

    window.open(card.linkUrl, "_blank", "noopener");
  }

  function handleAdd() {
    setEditingCard(null);
    setEditorOpen(true);
  }

  function handleEdit(e: React.MouseEvent, card: DashboardCard) {
    e.stopPropagation();
    setEditingCard(card);
    setEditorOpen(true);
  }

  function handleDelete(e: React.MouseEvent, card: DashboardCard) {
    e.stopPropagation();
    if (!confirm(`"${card.title}" 카드를 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(card.id);
  }

  async function handleSubmit(input: DashboardCardInput) {
    try {
      if (editingCard) {
        await updateMutation.mutateAsync({ id: editingCard.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
    } catch { /* 글로벌 onError에서 toast 처리 */ }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !cards) return;

    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(cards, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((c) => c.id));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">
          데이터를 불러오는 중 오류가 발생했습니다.
        </p>
      </div>
    );
  }

  const cardIds = cards?.map((c) => c.id) ?? [];

  return (
    <div className="space-y-4">
      {isEditor && (
        <div className="flex justify-end">
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            카드 추가
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cardIds} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards?.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                isEditor={isEditor}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={handleCardClick}
              />
            ))}

            {(!cards || cards.length === 0) && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-400">
                <ImageIcon className="h-12 w-12 mb-3" />
                <p>등록된 카드가 없습니다</p>
                {isEditor && (
                  <Button variant="link" onClick={handleAdd} className="mt-2">
                    첫 카드 추가하기
                  </Button>
                )}
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <DashboardCardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        card={editingCard}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { uploadPostImage } from "@/services/storage";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2, GripVertical } from "lucide-react";

interface CardNewsUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function CardNewsUploader({
  images,
  onChange,
}: CardNewsUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (fileArray.length === 0) return;

      setUploading(true);
      try {
        const urls = await Promise.all(fileArray.map((f) => uploadPostImage(f)));
        onChange([...images, ...urls]);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "이미지 업로드에 실패했습니다."
        );
      } finally {
        setUploading(false);
      }
    },
    [images, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...images];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    onChange(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="space-y-3">
      {/* 드롭 영역 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>업로드 중...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">
              클릭하거나 이미지를 드래그하여 추가
            </span>
            <span className="text-xs">JPG, PNG, GIF, WebP (최대 5MB)</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* 미리보기 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="relative group aspect-[3/4] rounded-md overflow-hidden border bg-muted cursor-grab active:cursor-grabbing"
            >
              <img
                src={url}
                alt={`카드 ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* 순서 번호 */}
              <span className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1.5 py-0.5">
                {i + 1}
              </span>
              {/* 드래그 핸들 */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-white drop-shadow" />
              </div>
              {/* 삭제 버튼 */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(i);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          총 {images.length}장 · 드래그로 순서 변경 가능
        </p>
      )}
    </div>
  );
}

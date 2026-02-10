import { useState, useCallback, useEffect } from "react";
import type { Post } from "@/types/post";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Pencil, Trash2, ImageOff } from "lucide-react";

interface CardNewsGalleryProps {
  posts: Post[];
  isEditor: boolean;
  onEdit: (post: Post) => void;
  onDelete: (id: number) => void;
}

/** posts.content에서 카드뉴스 이미지 배열 추출 */
export function parseCardNewsImages(content: string): string[] | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.images && Array.isArray(parsed.images)) return parsed.images;
  } catch {
    // JSON 아님 → 기존 HTML/평문
  }
  return null;
}

export default function CardNewsGallery({
  posts,
  isEditor,
  onEdit,
  onDelete,
}: CardNewsGalleryProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const selectedImages = selectedPost
    ? parseCardNewsImages(selectedPost.content)
    : null;

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => setCurrent(api.selectedScrollSnap() + 1));
  }, [api]);

  const openViewer = useCallback((post: Post) => {
    setSelectedPost(post);
  }, []);

  return (
    <>
      {/* 썸네일 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {posts.map((post) => {
          const images = parseCardNewsImages(post.content);
          const thumbnail = images?.[0];

          return (
            <div
              key={post.id}
              className="group relative rounded-lg overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
              onClick={() => openViewer(post)}
            >
              {/* 썸네일 */}
              <div className="aspect-square bg-muted">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* 장수 뱃지 */}
              {images && images.length > 1 && (
                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-0.5">
                  {images.length}장
                </span>
              )}

              {/* 정보 */}
              <div className="p-2">
                <p className="text-sm font-medium truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>

              {/* 에디터 버튼 */}
              {isEditor && (
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(post);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(post.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 모달 캐러셀 */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      >
        <DialogContent
          className="max-w-5xl p-0 gap-0 overflow-hidden"
          aria-describedby={undefined}
        >
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-base truncate">
              {selectedPost?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedImages && selectedImages.length > 0 && (
            <div className="px-4 pb-4">
              <Carousel
                setApi={setApi}
                opts={{ align: "start", slidesToScroll: 1 }}
                className="w-full"
              >
                <CarouselContent>
                  {selectedImages.map((url, i) => (
                    <CarouselItem key={url} className="basis-[75%]">
                      <div className="flex items-center justify-center bg-muted rounded-md overflow-hidden">
                        <img
                          src={url}
                          alt={`${selectedPost?.title} - ${i + 1}`}
                          className="max-h-[70vh] w-auto mx-auto object-contain"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>

              {/* 페이지 표시 */}
              <p className="text-center text-sm text-muted-foreground mt-2">
                {current} / {count}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useParams } from "react-router-dom";
import { usePage } from "@/hooks/usePages";
import PostContentRenderer from "@/components/posts/PostContentRenderer";
import { Loader2 } from "lucide-react";

export default function PageViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = usePage(slug || null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground">
        페이지를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{page.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {page.authorName} &middot;{" "}
          {new Date(page.updatedAt || page.createdAt).toLocaleDateString("ko-KR")}
        </p>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <PostContentRenderer content={page.content} />
      </div>
    </div>
  );
}

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

interface PostContentRendererProps {
  content: string;
}

// TipTap이 생성하는 HTML은 항상 <p>, <h2>, <h3>, <ul>, <ol>, <blockquote>, <img> 등으로 시작
const HTML_TAG_PATTERN = /^<(p|h[1-6]|ul|ol|blockquote|div|img|pre)[\s>]/;

function isHtmlContent(content: string): boolean {
  return HTML_TAG_PATTERN.test(content.trim());
}

function HtmlRenderer({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false } as never),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: true }),
    ],
    content,
    editable: false,
  });

  return <EditorContent editor={editor} className="tiptap-viewer" />;
}

export default function PostContentRenderer({
  content,
}: PostContentRendererProps) {
  if (!content) return null;

  if (isHtmlContent(content)) {
    return <HtmlRenderer content={content} />;
  }

  // 평문: 기존 방식 유지
  return (
    <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
  );
}

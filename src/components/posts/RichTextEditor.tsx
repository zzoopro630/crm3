import { useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { uploadPostImage } from "@/services/storage";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "내용을 입력하세요",
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingCountRef = useRef(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;

      uploadingCountRef.current++;

      // placeholder 삽입
      const placeholderId = `upload-${Date.now()}`;
      editor
        .chain()
        .focus()
        .setImage({
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='40'%3E%3Crect width='200' height='40' fill='%23f0f0f0' rx='4'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' fill='%23999' font-size='13'%3E업로드 중...%3C/text%3E%3C/svg%3E",
          alt: placeholderId,
        })
        .run();

      try {
        const url = await uploadPostImage(file);

        // placeholder를 실제 이미지로 교체
        const { doc } = editor.state;
        let placeholderPos: number | null = null;
        doc.descendants((node, pos) => {
          if (
            node.type.name === "image" &&
            node.attrs.alt === placeholderId
          ) {
            placeholderPos = pos;
            return false;
          }
        });

        if (placeholderPos !== null) {
          const tr = editor.state.tr;
          tr.setNodeMarkup(placeholderPos, undefined, {
            src: url,
            alt: "",
          });
          editor.view.dispatch(tr);
        }
      } catch (err) {
        // placeholder 제거
        const { doc } = editor.state;
        let placeholderPos: number | null = null;
        doc.descendants((node, pos) => {
          if (
            node.type.name === "image" &&
            node.attrs.alt === placeholderId
          ) {
            placeholderPos = pos;
            return false;
          }
        });

        if (placeholderPos !== null) {
          const tr = editor.state.tr;
          tr.delete(placeholderPos, placeholderPos + 1);
          editor.view.dispatch(tr);
        }

        alert(
          err instanceof Error ? err.message : "이미지 업로드에 실패했습니다."
        );
      } finally {
        uploadingCountRef.current--;
      }
    },
    [editor]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach(handleImageUpload);
      e.target.value = "";
    },
    [handleImageUpload]
  );

  const handlePaste = useCallback(
    (_view: unknown, event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return false;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageUpload(file);
          return true;
        }
      }
      return false;
    },
    [handleImageUpload]
  );

  const handleDrop = useCallback(
    (_view: unknown, event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return false;

      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (imageFiles.length === 0) return false;

      event.preventDefault();
      imageFiles.forEach(handleImageUpload);
      return true;
    },
    [handleImageUpload]
  );

  // 에디터에 paste/drop 핸들러 등록
  if (editor) {
    editor.setOptions({
      editorProps: {
        handlePaste: handlePaste as never,
        handleDrop: handleDrop as never,
      },
    });
  }

  const insertLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("링크 URL을 입력하세요:");
    if (!url) return;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-[200px] border rounded-md">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="굵게"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="기울임"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="취소선"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="제목 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="제목 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="목록"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="번호 목록"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("link")}
          onClick={insertLink}
          title="링크"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={false}
          onClick={() => fileInputRef.current?.click()}
          title="이미지"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* 에디터 영역 */}
      <EditorContent editor={editor} className="tiptap-editor" />

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${active ? "bg-accent text-accent-foreground" : ""}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

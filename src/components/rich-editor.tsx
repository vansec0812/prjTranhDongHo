"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
export function RichEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  });
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="editor-toolbar">
        <button
          type="button"
          aria-label="Chữ đậm"
          aria-pressed={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-label="Chữ nghiêng"
          aria-pressed={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          aria-label="Danh sách"
          aria-pressed={editor?.isActive("bulletList") ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Danh sách
        </button>
        <button
          type="button"
          aria-label="Tiêu đề cấp 2"
          aria-pressed={editor?.isActive("heading", { level: 2 }) ?? false}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Hoàn tác
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

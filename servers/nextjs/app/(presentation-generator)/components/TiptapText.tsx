"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Underline from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline as UnderlinedIcon,
  Strikethrough,
  Code,
  Palette,
  Type,
} from "lucide-react";

// Custom FontSize extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`
          };
        },
      },
    };
  },
});


interface TiptapTextProps {
  content: string;

  onContentChange?: (content: string) => void;
  className?: string;
  placeholder?: string;
  isEditable?: boolean;
}

const TiptapText: React.FC<TiptapTextProps> = ({
  content,
  onContentChange,
  className = "",
  placeholder = "Enter text...",
  isEditable = true,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Underline,
      FontSize,
      Color,
    ],
    content: content || placeholder,
    editable: isEditable,
    editorProps: {
      attributes: {
        class: `outline-none focus:outline-none transition-all duration-200 ${className}`,
        "data-placeholder": placeholder,
      },
    },
    onBlur: ({ editor }) => {
      // const element = editor?.options.element;
      // element?.classList.add("tiptap-text-edited");
      const markdown = editor?.storage.markdown.getMarkdown();
      if (onContentChange) {
        onContentChange(markdown);
      }
    },

    immediatelyRender: false,
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (!editor) return;
    // Compare against current plain text to avoid unnecessary updates
    const currentText = editor?.storage.markdown.getMarkdown();
    if ((content || "") !== currentText) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  // Update editable state when prop changes
  useEffect(() => {
    if (editor && editor.isEditable !== isEditable) {
      editor.setEditable(isEditable);
    }
  }, [isEditable, editor]);


  if (!editor) {
    return <div className={className}>{content || placeholder}</div>;
  }

  return (
    <>
      {isEditable && (
        <BubbleMenu
          editor={editor}
          className="z-50"
          tippyOptions={{ duration: 100 }}
        >
          <div
            style={{
              zIndex: 100,
            }}
            className="flex text-black bg-white  rounded-lg shadow-lg p-2 gap-1 border border-gray-200 z-50"
          >
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${editor?.isActive("bold") ? "bg-blue-100 text-blue-600" : ""
                }`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${editor?.isActive("italic") ? "bg-blue-100 text-blue-600" : ""
                }`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${editor?.isActive("underline") ? "bg-blue-100 text-blue-600" : ""
                }`}
              title="Underline"
            >
              <UnderlinedIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${editor?.isActive("strike") ? "bg-blue-100 text-blue-600" : ""
                }`}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleCode().run()}
              className={`p-1 rounded hover:bg-gray-100 transition-colors ${editor?.isActive("code") ? "bg-blue-100 text-blue-600" : ""
                }`}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            {/* Color Picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Text Color"
              >
                <Palette className="h-4 w-4" />
              </button>
              {showColorPicker && (
                <div className="absolute top-full mt-1 bg-white border rounded-lg shadow-lg p-2 z-50 flex flex-wrap gap-1 w-32">
                  {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#808080', '#FFA500'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor?.chain().focus().setColor(color).run();
                        setCurrentColor(color);
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const currentSize = editor?.getAttributes('textStyle').fontSize || '16px';
                  const size = parseInt(currentSize);
                  editor?.chain().focus().setMark('textStyle', { fontSize: `${Math.max(8, size - 2)}px` }).run();
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Decrease Font Size"
              >
                <Type className="h-3 w-3" />
              </button>

              <input
                type="number"
                min="8"
                max="72"
                value={parseInt(editor?.getAttributes('textStyle').fontSize || '16')}
                onChange={(e) => {
                  const size = Math.min(72, Math.max(8, parseInt(e.target.value) || 16));
                  editor?.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
                }}
                className="w-12 px-1 py-0.5 text-xs text-center border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <button
                onClick={() => {
                  const currentSize = editor?.getAttributes('textStyle').fontSize || '16px';
                  const size = parseInt(currentSize);
                  editor?.chain().focus().setMark('textStyle', { fontSize: `${Math.min(72, size + 2)}px` }).run();
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Increase Font Size"
              >
                <Type className="h-5 w-5" />
              </button>
            </div>
          </div>
        </BubbleMenu>
      )}

      <EditorContent
        editor={editor}
        className={`tiptap-text-editor w-full`}
        style={{
          // Ensure the editor maintains the same visual appearance
          lineHeight: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          fontFamily: "inherit",
          color: "inherit",
          textAlign: "inherit",
        }}
      />
    </>
  );
};

export default TiptapText;

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { useState, useEffect, useRef } from 'react'
import { Button } from '~/components/ui/button'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Undo,
  Redo,
  Code,
  ImageIcon,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
  Palette,
  RemoveFormatting,
} from 'lucide-react'
import { cn } from '~/lib/utils'

interface WysiwygEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function WysiwygEditor({ content, onChange, placeholder, className }: WysiwygEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing...',
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-md max-w-full' },
      }),
      Youtube.configure({
        HTMLAttributes: { class: 'rounded-md w-full aspect-video' },
        width: 640,
        height: 480,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML())
    },
  })

  // Sync external content changes (e.g. on entity switch)
  const initialContent = useRef(content)
  useEffect(() => {
    if (editor && content !== initialContent.current) {
      const currentHtml = editor.getHTML()
      if (content !== currentHtml) {
        editor.commands.setContent(content)
      }
      initialContent.current = content
    }
  }, [content, editor])

  if (!editor) return null

  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addYoutube = () => {
    const url = window.prompt('YouTube URL')
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run()
    }
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Link URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className={cn('rounded-md border flex flex-col h-[calc(100dvh-12rem)]', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap border-b px-1 py-1 bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>

        <Separator />

        <ColorPicker
          currentColor={editor.getAttributes('textStyle').color ?? ''}
          onSelect={(color) => {
            if (color) {
              editor.chain().focus().setColor(color).run()
            } else {
              editor.chain().focus().unsetColor().run()
            }
          }}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Clear Formatting"
        >
          <RemoveFormatting className="size-4" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton onClick={addImage} title="Insert Image">
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addYoutube} title="Embed YouTube">
          <YoutubeIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={addLink}
          active={editor.isActive('link')}
          title="Insert Link"
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="size-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="p-4 flex-1 overflow-y-auto text-sm [&_.tiptap]:h-full"
      />
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-7', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  )
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />
}

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#9ca3af' },
]

function ColorPicker({
  currentColor,
  onSelect,
}: {
  currentColor: string
  onSelect: (color: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-7', open && 'bg-accent')}
        onClick={() => setOpen(!open)}
        title="Text Color"
      >
        <Palette className="size-4" style={currentColor ? { color: currentColor } : undefined} />
      </Button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-1.5 shadow-elevated">
          <div className="flex gap-1 flex-wrap w-40">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                className={cn(
                  'size-6 rounded-md border transition-transform hover:scale-110',
                  currentColor === c.value && 'ring-2 ring-primary ring-offset-1',
                )}
                style={{ backgroundColor: c.value || 'var(--color-foreground)' }}
                title={c.label}
                onClick={() => { onSelect(c.value); setOpen(false) }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { useEditor, EditorContent, type Editor, mergeAttributes } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapImage from "@tiptap/extension-image"
import ImageResize from "tiptap-extension-resize-image"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Placeholder from "@tiptap/extension-placeholder"
import { 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Heading2, Heading3, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify
} from "lucide-react"
import { toast } from "sonner"
import { validateUpload } from "@/lib/upload-validation"

// Extendemos los tipos de Tiptap para que reconozca nuestros atributos personalizados sin usar 'any'
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageResize: {
      setImage: (options: { 
        src: string, 
        alt?: string, 
        title?: string, 
        width?: number | string, 
        align?: 'left' | 'center' | 'right' 
      }) => ReturnType,
    }
  }
}

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

const IMAGE_NODE = "image"

/** Clase compartida: mismo aspecto en editor y en blog (HTML guardado) */
const CONTENT_IMG_CLASS = "miauw-content-img"

/** Utilidades de Imagen */
const insertImageAt = (editor: Editor, src: string, insertAt?: number) => {
  const payload = { 
    type: IMAGE_NODE, 
    attrs: { 
      src, 
      align: 'left', // Por defecto a la izquierda estilo Bart
      width: 300     // Por defecto tamaño Bart
    } 
  }
  if (typeof insertAt === "number") {
    editor.chain().focus().insertContentAt(insertAt, payload).run()
  } else {
    editor.chain().focus().insertContent(payload).run()
  }
}

const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })
  if (!res.ok) throw new Error("upload failed")
  const data = (await res.json()) as { secure_url?: string }
  if (!data.secure_url) throw new Error("no url")
  return data.secure_url
}

const neoBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[2.5px] border-[#000000] bg-white text-[#000000] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 hover:bg-[#E7BEF8] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-35"

const neoMarkActive = "bg-[#e7bef8] text-[#000000]"

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, bump] = useReducer((n) => n + 1, 0)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!editor) return
    const onChange = () => bump()
    editor.on("selectionUpdate", onChange)
    editor.on("transaction", onChange)
    return () => {
      editor.off("selectionUpdate", onChange)
      editor.off("transaction", onChange)
    }
  }, [editor])

  const addLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL del enlace:", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    if (!editor || isUploading) return
    fileInputRef.current?.click()
  }, [editor, isUploading])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor || !validateUpload(file)) return

    try {
      setIsUploading(true)
      toast.info("Subiendo imagen...", { duration: 2000 })
      
      const url = await uploadToCloudinary(file)
      
      // Insertamos a la izquierda con un ancho razonable para el estilo "periódico"
      editor.chain().focus().setImage({ 
        src: url,
        align: 'left',
        width: 300 
      }).run()
      
      toast.success("Imagen insertada correctamente")
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Error al subir imagen al editor")
    } finally {
      setIsUploading(false)
      // Reset input value to allow the same file to be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (!editor) return null

  return (
    <div className="border-b-[3px] border-[#000000] bg-[#EDE986] px-3 py-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border-[3px] border-[#000000] bg-white px-1.5 py-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <button type="button" title="Negrita" className={`${neoBtn} ${editor.isActive("bold") ? neoMarkActive : ""}`} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </button>
          <button type="button" title="Cursiva" className={`${neoBtn} ${editor.isActive("italic") ? neoMarkActive : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-[2px] shrink-0 bg-[#000000]/25" aria-hidden />
          <button type="button" title="Título H2" className={`${neoBtn} ${editor.isActive("heading", { level: 2 }) ? neoMarkActive : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </button>
          <button type="button" title="Subtítulo H3" className={`${neoBtn} ${editor.isActive("heading", { level: 3 }) ? neoMarkActive : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-[2px] shrink-0 bg-[#000000]/25" aria-hidden />
          <button type="button" title="Lista con viñetas" className={`${neoBtn} ${editor.isActive("bulletList") ? neoMarkActive : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </button>
          <button type="button" title="Lista numerada" className={`${neoBtn} ${editor.isActive("orderedList") ? neoMarkActive : ""}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-[2px] shrink-0 bg-[#000000]/25" aria-hidden />
          <button 
            type="button" 
            title={isUploading ? "Subiendo..." : "Insertar imagen"} 
            className={`${neoBtn} ${isUploading ? "opacity-50 cursor-wait bg-[#E7BEF8]" : ""}`} 
            onClick={addImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#000000] border-t-transparent" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </button>
          <span className="mx-0.5 h-5 w-[2px] shrink-0 bg-[#000000]/25" aria-hidden />
          <button 
            type="button" 
            title="Alinear Izquierda" 
            className={`${neoBtn} ${(editor.isActive({ textAlign: "left" }) || editor.isActive("image", { align: "left" })) ? neoMarkActive : ""}`} 
            onClick={() => {
              if (editor.isActive("image")) {
                editor.chain().focus().updateAttributes("image", { align: "left" }).run()
              } else {
                editor.chain().focus().setTextAlign("left").run()
              }
            }}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button 
            type="button" 
            title="Centrar" 
            className={`${neoBtn} ${(editor.isActive({ textAlign: "center" }) || editor.isActive("image", { align: "center" })) ? neoMarkActive : ""}`} 
            onClick={() => {
              if (editor.isActive("image")) {
                editor.chain().focus().updateAttributes("image", { align: "center" }).run()
              } else {
                editor.chain().focus().setTextAlign("center").run()
              }
            }}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button 
            type="button" 
            title="Alinear Derecha" 
            className={`${neoBtn} ${(editor.isActive({ textAlign: "right" }) || editor.isActive("image", { align: "right" })) ? neoMarkActive : ""}`} 
            onClick={() => {
              if (editor.isActive("image")) {
                editor.chain().focus().updateAttributes("image", { align: "right" }).run()
              } else {
                editor.chain().focus().setTextAlign("right").run()
              }
            }}
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-[2px] shrink-0 bg-[#000000]/25" aria-hidden />
          <button type="button" title="Insertar enlace" className={`${neoBtn} ${editor.isActive("link") ? neoMarkActive : ""}`} onClick={addLink}>
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

const ResizableImage = ImageResize.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left', // Cambiado a left por defecto para el estilo Bart
        renderHTML: attributes => ({
          'data-align': attributes.align,
        }),
        parseHTML: element => element.getAttribute('data-align') || 'left',
      },
    }
  },
  // Sobrescribimos renderHTML si es necesario para asegurar que la clase se guarde
  renderHTML({ HTMLAttributes }) {
    return [
      'div', 
      { 
        class: 'node-imageResize', 
        'data-align': HTMLAttributes.align || 'left',
      }, 
      ['img', mergeAttributes(HTMLAttributes, { class: CONTENT_IMG_CLASS })]
    ]
  },
})

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Empieza a escribir tu historia…",
}: RichTextEditorProps) {
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        dropcursor: {
          color: "#000000",
          width: 4,
          class: "miauw-dropcursor-line",
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "miauw-link",
        },
      }),
      ResizableImage.configure({
        inline: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-sm sm:prose-base max-w-none min-h-[400px] bg-white p-5 font-medium focus:outline-none md:p-8 " +
          "prose-p:text-[#000000] prose-headings:font-black prose-headings:font-heading prose-headings:text-[#000000]",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false
        const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith("image/"))
        if (!file || !validateUpload(file)) return false
        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        const pos = coords?.pos
        void (async () => {
          try {
            const url = await uploadToCloudinary(file)
            const ed = editorRef.current
            if (!ed || ed.isDestroyed || !ed.state.schema.nodes[IMAGE_NODE]) return
            insertImageAt(ed, url, typeof pos === "number" ? pos : undefined)
          } catch {
            toast.error("Error al subir imagen")
          }
        })()
        return true
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (!file || !validateUpload(file)) continue
            event.preventDefault()
            void (async () => {
              try {
                const url = await uploadToCloudinary(file)
                const ed = editorRef.current
                if (!ed || ed.isDestroyed) return
                insertImageAt(ed, url)
              } catch {
                toast.error("Error al subir imagen")
              }
            })()
            return true
          }
        }
        return false
      },
    },
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (editor.isFocused) return
    const current = editor.getHTML()
    if (content !== current) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  return (
    <div className="group w-full rounded-2xl border-[3px] border-[#000000] bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow focus-within:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
      <Toolbar editor={editor} />
      <div className="overflow-visible">
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .ProseMirror .miauw-dropcursor-line {
          background: #000000 !important;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.35);
          border-radius: 2px;
        }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .tiptap {
          display: block;
          outline: none !important;
        }
        .tiptap p {
          display: flow-root;
        }
        /* Enlaces */
        .tiptap a.miauw-link {
          color: #000000 !important;
          font-weight: 900;
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-under-line-offset: 2px;
          cursor: pointer;
        }
        .tiptap a.miauw-link:hover {
          color: #e7bef8 !important;
        }
        /* Imagen en bloque: mismo ritmo vertical que el blog */
        .tiptap .miauw-content-img,
        .tiptap img.miauw-content-img {
          display: block;
          max-width: 100%;
          height: auto;
          box-sizing: border-box;
          border-radius: 1rem;
          border: 3px solid #000000;
          box-shadow: 6px 6px 0 0 #000000;
          margin: 1rem 0;
        }
        .tiptap [data-resize-container][data-node="image"] {
          display: block;
          max-width: 100%;
          margin: 1rem 0;
          box-sizing: border-box;
        }
        .tiptap [data-resize-container][data-node="image"] img.miauw-content-img,
        .tiptap [data-resize-container][data-node="image"] img {
          display: block;
          max-width: 100%;
          height: auto;
          box-sizing: border-box;
          border-radius: 1rem;
          border: 3px solid #000000;
          box-shadow: 6px 6px 0 0 #000000;
          margin: 0;
        }
        /* Contenedor de redimensionamiento: permite envolver texto si está alineado */
        .tiptap .node-imageResize {
          display: inline-block;
          max-width: 300px !important;
          line-height: 0;
          vertical-align: top;
        }
        .tiptap .node-imageResize[data-align="left"] {
          float: left;
          margin-right: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 5px !important;
        }
        .tiptap .node-imageResize[data-align="right"] {
          float: right;
          margin-left: 20px !important;
          margin-bottom: 10px !important;
          margin-top: 5px !important;
        }
        .tiptap .node-imageResize[data-align="center"] {
          display: block;
          margin-left: auto;
          margin-right: auto;
          float: none;
        }
        /* Estilos de los manejadores */
        [data-resize-handle] {
          width: 10px !important;
          height: 10px !important;
          min-width: 10px;
          min-height: 10px;
          background: #fff !important;
          border: 2px solid #000000 !important;
          border-radius: 2px !important;
          box-shadow: 2px 2px 0 0 #000 !important;
          z-index: 5;
        }
      `}</style>
    </div>
  )
}

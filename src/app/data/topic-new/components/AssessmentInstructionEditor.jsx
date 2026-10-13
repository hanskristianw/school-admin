'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Highlight } from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Extension } from '@tiptap/core'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUndo,
  faRedo,
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faFont,
  faHighlighter,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faListUl,
  faListOl,
  faTasks,
  faOutdent,
  faIndent,
  faTable,
  faMinus,
  faEraser,
  faChevronDown,
  faPlus,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'

import { isHtmlContent, isHtmlEmpty } from '../lib/instructionDocxHelper'

/**
 * Custom FontSize extension for TipTap
 */
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).run()
      },
    }
  },
})

/**
 * Custom Indent extension for TipTap
 * Allows increasing and decreasing indentation on paragraphs and headings.
 */
const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'listItem'],
      minLevel: 0,
      maxLevel: 8,
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: element => {
              // Never parse indent on a paragraph inside a list item!
              if (element.tagName === 'P' && element.closest('li')) {
                return 0
              }
              const dataIndent = parseInt(element.getAttribute('data-indent'), 10)
              if (!isNaN(dataIndent) && dataIndent > 0) return dataIndent
              const marginLeft = element.style?.marginLeft
              if (marginLeft) {
                const pxMatch = marginLeft.match(/(\d+(?:\.\d+)?)px/)
                if (pxMatch) return Math.round(parseFloat(pxMatch[1]) / 24)
                const ptMatch = marginLeft.match(/(\d+(?:\.\d+)?)pt/)
                if (ptMatch) return Math.round(parseFloat(ptMatch[1]) / 18)
              }
              return 0
            },
            renderHTML: attributes => {
              if (!attributes.indent || attributes.indent <= 0) return {}
              return {
                style: `margin-left: ${attributes.indent * 24}px;`,
                'data-indent': String(attributes.indent),
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      indent: () => ({ tr, state, dispatch }) => {
        const { selection } = state
        const { from, to } = selection
        let changed = false
        state.doc.nodesBetween(from, to, (node, pos, parent) => {
          // If parent is a listItem or taskItem, do NOT indent this inner child (e.g. inner <p>)!
          if (parent && (parent.type.name === 'listItem' || parent.type.name === 'taskItem')) {
            return false
          }
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent || 0
            if (currentIndent < this.options.maxLevel) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: currentIndent + 1,
              })
              // Also heal any child paragraph that may have an old indent
              if (node.type.name === 'listItem') {
                node.forEach((child, offset) => {
                  if (child.type.name === 'paragraph' && (child.attrs.indent || 0) > 0) {
                    tr = tr.setNodeMarkup(pos + 1 + offset, undefined, {
                      ...child.attrs,
                      indent: 0,
                    })
                  }
                })
              }
              changed = true
            }
            return false
          }
        })
        if (changed && dispatch) dispatch(tr)
        return changed
      },
      outdent: () => ({ tr, state, dispatch }) => {
        const { selection } = state
        const { from, to } = selection
        let changed = false
        state.doc.nodesBetween(from, to, (node, pos, parent) => {
          if (parent && (parent.type.name === 'listItem' || parent.type.name === 'taskItem')) {
            return false
          }
          if (this.options.types.includes(node.type.name)) {
            const currentIndent = node.attrs.indent || 0
            if (currentIndent > this.options.minLevel) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                indent: currentIndent - 1,
              })
              // Also heal any child paragraph that may have an old indent
              if (node.type.name === 'listItem') {
                node.forEach((child, offset) => {
                  if (child.type.name === 'paragraph' && (child.attrs.indent || 0) > 0) {
                    tr = tr.setNodeMarkup(pos + 1 + offset, undefined, {
                      ...child.attrs,
                      indent: 0,
                    })
                  }
                })
              }
              changed = true
            }
            return false
          }
        })
        if (changed && dispatch) dispatch(tr)
        return changed
      },
    }
  },
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.isActive('table')) return false
        if (this.editor.can().sinkListItem('listItem')) {
          return this.editor.chain().sinkListItem('listItem').run()
        }
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table')) return false
        if (this.editor.can().liftListItem('listItem')) {
          return this.editor.chain().liftListItem('listItem').run()
        }
        return this.editor.commands.outdent()
      },
    }
  },
})

/**
 * Convert legacy plain text (with \n) into standard HTML paragraphs
 */
function plainTextToHtml(plainText) {
  if (!plainText) return ''
  const lines = String(plainText).split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return ''
  return lines.map(line => `<p>${line}</p>`).join('')
}

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
]

const FONT_SIZES = ['9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '24pt', '30pt']

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
]

const HIGHLIGHT_COLORS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#FFFF00' },
  { label: 'Green', value: '#00FF00' },
  { label: 'Cyan', value: '#00FFFF' },
  { label: 'Pink', value: '#FF00FF' },
  { label: 'Orange', value: '#FFA500' },
  { label: 'Light Blue', value: '#C9DAF8' },
  { label: 'Light Gray', value: '#EFEFEF' },
]

/**
 * AssessmentInstructionEditor
 * High-end Google Docs / Microsoft Word-style WYSIWYG editor using TipTap.
 */
export default function AssessmentInstructionEditor({
  value = '',
  onChange,
  placeholder = 'Type assessment instructions here... (e.g. Criterion expectations, step-by-step student tasks, research guidelines)',
  disabled = false,
  minHeight = 160,
  className = '',
}) {
  const containerRef = useRef(null)
  const isUpdatingFromProp = useRef(false)

  // Active Dropdowns state
  const [openMenu, setOpenMenu] = useState(null) // 'style' | 'font' | 'size' | 'color' | 'highlight' | 'table' | 'orderedList'
  const [customStartInput, setCustomStartInput] = useState('2')

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initialContent = React.useMemo(() => {
    if (!value || isHtmlEmpty(value)) return ''
    if (isHtmlContent(value)) return value
    return plainTextToHtml(value)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Indent,
      Highlight.configure({ multicolor: true }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: initialContent,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (isUpdatingFromProp.current) return
      const html = editor.getHTML()
      const clean = isHtmlEmpty(html) ? '' : html
      if (onChange) {
        onChange(clean)
      }
    },
  })

  // Synchronize value updates from outside
  useEffect(() => {
    if (!editor) return
    const currentHtml = editor.getHTML()
    const targetHtml = !value || isHtmlEmpty(value) ? '' : (isHtmlContent(value) ? value : plainTextToHtml(value))

    if (targetHtml !== currentHtml) {
      isUpdatingFromProp.current = true
      editor.commands.setContent(targetHtml || '', false)
      isUpdatingFromProp.current = false
    }
  }, [value, editor])

  // Synchronize disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-md p-4 bg-white min-h-[160px] animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    )
  }

  // Active checks
  const isBold = editor.isActive('bold')
  const isItalic = editor.isActive('italic')
  const isUnderline = editor.isActive('underline')
  const isStrike = editor.isActive('strike')
  const isBulletList = editor.isActive('bulletList')
  const isOrderedList = editor.isActive('orderedList')
  const isTaskList = editor.isActive('taskList')
  const isTable = editor.isActive('table')

  // Current style label
  let currentStyleLabel = 'Normal text'
  if (editor.isActive('heading', { level: 1 })) currentStyleLabel = 'Heading 1'
  else if (editor.isActive('heading', { level: 2 })) currentStyleLabel = 'Heading 2'
  else if (editor.isActive('heading', { level: 3 })) currentStyleLabel = 'Heading 3'

  // Current font label
  const activeFontFamily = editor.getAttributes('textStyle').fontFamily
  const currentFontObj = FONT_FAMILIES.find(f => f.value === activeFontFamily)
  const currentFontLabel = currentFontObj ? currentFontObj.label : 'Arial'

  // Current font size
  const activeFontSize = editor.getAttributes('textStyle').fontSize || '11pt'

  // Current start number of active ordered list
  const currentStartNumber = editor.getAttributes('orderedList').start || 1

  // Compute suggested start number based on lists preceding the current selection
  const getSuggestedStartNumber = () => {
    if (!editor) return 2
    try {
      const { state } = editor
      const { $from } = state.selection
      let lastEnd = 0
      let found = false

      state.doc.nodesBetween(0, $from.pos, (node, pos) => {
        if (node.type.name === 'orderedList') {
          const start = node.attrs.start || 1
          const childCount = node.childCount || 1
          if (pos + node.nodeSize <= $from.pos) {
            lastEnd = start + childCount - 1
            found = true
          }
        }
      })

      return found ? lastEnd + 1 : 2
    } catch {
      return 2
    }
  }

  const suggestedStart = getSuggestedStartNumber()

  const applyOrderedListStart = (num) => {
    if (!editor) return
    const targetNum = Math.max(1, parseInt(num, 10) || 1)

    // Check if the current line starts with a manual prefix like "2. " or "2) " and clean it
    try {
      const { state } = editor.view
      const { $from } = state.selection
      const parent = $from.parent
      if (parent && parent.isTextblock) {
        const text = parent.textContent || ''
        const match = text.match(/^(\d+[\.\)]\s*)/)
        if (match) {
          const startPos = $from.start()
          const prefixLen = match[1].length
          editor.chain().focus().deleteRange({ from: startPos, to: startPos + prefixLen }).run()
        }
      }
    } catch (e) {
      console.warn('Could not clean manual prefix:', e)
    }

    if (!editor.isActive('orderedList')) {
      editor.chain().focus().toggleOrderedList().run()
    }
    editor.chain().focus().updateAttributes('orderedList', { start: targetNum }).run()
    setOpenMenu(null)
  }

  const handleIncreaseIndent = () => {
    if (!editor) return
    editor.chain().focus().run()
    editor.commands.indent()
  }

  const handleDecreaseIndent = () => {
    if (!editor) return
    editor.chain().focus().run()
    editor.commands.outdent()
  }

  const toggleMenu = (name) => {
    setOpenMenu(prev => prev === name ? null : name)
  }

  return (
    <div
      ref={containerRef}
      className={`border border-gray-300 rounded-md bg-white shadow-xs overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 ${disabled ? 'bg-gray-50 opacity-80' : ''} ${className}`}
    >
      {/* ─── Google Docs / Microsoft Word Ribbon Toolbar ─── */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 px-2.5 py-1.5 bg-[#F8F9FA] border-b border-gray-200 text-gray-700 text-xs select-none">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
            className="w-7 h-7 rounded hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer"
          >
            <FontAwesomeIcon icon={faUndo} className="w-3 h-3 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
            className="w-7 h-7 rounded hover:bg-gray-200 active:bg-gray-300 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer"
          >
            <FontAwesomeIcon icon={faRedo} className="w-3 h-3 text-gray-600" />
          </button>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Paragraph Style Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('style')}
              title="Styles"
              className="h-7 px-2 rounded hover:bg-gray-200 active:bg-gray-300 flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer text-[11px]"
            >
              <span>{currentStyleLabel}</span>
              <FontAwesomeIcon icon={faChevronDown} className="w-2.5 h-2.5 text-gray-400" />
            </button>

            {openMenu === 'style' && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30">
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setParagraph().run()
                    setOpenMenu(null)
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-xs cursor-pointer ${currentStyleLabel === 'Normal text' ? 'bg-blue-50 text-blue-700 font-semibold' : ''}`}
                >
                  <span>Normal text</span>
                  <span className="text-[10px] text-gray-400">Ctrl+Alt+0</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                    setOpenMenu(null)
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-xs cursor-pointer ${currentStyleLabel === 'Heading 1' ? 'bg-blue-50 text-blue-700 font-semibold' : ''}`}
                >
                  <span className="font-bold text-sm">Heading 1</span>
                  <span className="text-[10px] text-gray-400">Ctrl+Alt+1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                    setOpenMenu(null)
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-xs cursor-pointer ${currentStyleLabel === 'Heading 2' ? 'bg-blue-50 text-blue-700 font-semibold' : ''}`}
                >
                  <span className="font-bold text-xs">Heading 2</span>
                  <span className="text-[10px] text-gray-400">Ctrl+Alt+2</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run()
                    setOpenMenu(null)
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-xs cursor-pointer ${currentStyleLabel === 'Heading 3' ? 'bg-blue-50 text-blue-700 font-semibold' : ''}`}
                >
                  <span className="font-bold text-[11px]">Heading 3</span>
                  <span className="text-[10px] text-gray-400">Ctrl+Alt+3</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Font Family Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('font')}
              title="Font Family"
              className="h-7 px-2 rounded hover:bg-gray-200 active:bg-gray-300 flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer text-[11px] max-w-[110px]"
            >
              <span className="truncate">{currentFontLabel}</span>
              <FontAwesomeIcon icon={faChevronDown} className="w-2.5 h-2.5 text-gray-400" />
            </button>

            {openMenu === 'font' && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 max-h-60 overflow-y-auto">
                {FONT_FAMILIES.map((font) => (
                  <button
                    key={font.label}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setFontFamily(font.value).run()
                      setOpenMenu(null)
                    }}
                    style={{ fontFamily: font.value }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs cursor-pointer ${currentFontLabel === font.label ? 'bg-blue-50 text-blue-700 font-semibold' : ''}`}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Font Size Selector */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                const currentIndex = FONT_SIZES.indexOf(activeFontSize)
                if (currentIndex > 0) {
                  editor.chain().focus().setFontSize(FONT_SIZES[currentIndex - 1]).run()
                }
              }}
              title="Decrease font size"
              className="w-6 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold cursor-pointer"
            >
              -
            </button>

            <button
              type="button"
              onClick={() => toggleMenu('size')}
              title="Font Size"
              className="h-7 px-1.5 rounded hover:bg-gray-200 flex items-center justify-center font-medium text-gray-700 cursor-pointer text-[11px] min-w-[34px]"
            >
              {activeFontSize.replace('pt', '')}
            </button>

            <button
              type="button"
              onClick={() => {
                const currentIndex = FONT_SIZES.indexOf(activeFontSize)
                if (currentIndex >= 0 && currentIndex < FONT_SIZES.length - 1) {
                  editor.chain().focus().setFontSize(FONT_SIZES[currentIndex + 1]).run()
                } else if (currentIndex === -1) {
                  editor.chain().focus().setFontSize('12pt').run()
                }
              }}
              title="Increase font size"
              className="w-6 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold cursor-pointer"
            >
              +
            </button>

            {openMenu === 'size' && (
              <div className="absolute top-full left-0 mt-1 w-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 max-h-56 overflow-y-auto">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setFontSize(size).run()
                      setOpenMenu(null)
                    }}
                    className={`w-full text-center py-1 hover:bg-gray-100 text-xs cursor-pointer ${activeFontSize === size ? 'bg-blue-50 text-blue-700 font-semibold' : ''}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Basic Text Formats: B, I, U, S */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors ${isBold ? 'bg-[#D3E3FD] text-[#041E49] font-bold' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faBold} className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors ${isItalic ? 'bg-[#D3E3FD] text-[#041E49] font-bold' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faItalic} className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline (Ctrl+U)"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors ${isUnderline ? 'bg-[#D3E3FD] text-[#041E49] font-bold' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faUnderline} className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough (Alt+Shift+5)"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors ${isStrike ? 'bg-[#D3E3FD] text-[#041E49] font-bold' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faStrikethrough} className="w-3 h-3" />
          </button>

          {/* Text Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('color')}
              title="Text Color"
              className="w-7 h-7 rounded hover:bg-gray-200 flex flex-col items-center justify-center cursor-pointer gap-0.5"
            >
              <FontAwesomeIcon icon={faFont} className="w-3 h-3 text-gray-700" />
              <div
                className="w-4 h-1 rounded-xs"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
              />
            </button>

            {openMenu === 'color' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg p-2.5 z-30">
                <div className="text-[11px] font-semibold text-gray-600 mb-1.5">Text Color</div>
                <div className="grid grid-cols-10 gap-1">
                  {TEXT_COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(c).run()
                        setOpenMenu(null)
                      }}
                      style={{ backgroundColor: c }}
                      className="w-4 h-4 rounded-xs border border-gray-300 hover:scale-115 transition-transform cursor-pointer"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run()
                    setOpenMenu(null)
                  }}
                  className="mt-2 text-[11px] text-blue-600 hover:underline cursor-pointer block"
                >
                  Reset to default
                </button>
              </div>
            )}
          </div>

          {/* Highlight Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('highlight')}
              title="Highlight Color"
              className={`w-7 h-7 rounded flex flex-col items-center justify-center cursor-pointer gap-0.5 ${editor.isActive('highlight') ? 'bg-[#D3E3FD]' : 'hover:bg-gray-200'}`}
            >
              <FontAwesomeIcon icon={faHighlighter} className="w-3 h-3 text-gray-700" />
              <div
                className="w-4 h-1 rounded-xs bg-yellow-400"
              />
            </button>

            {openMenu === 'highlight' && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg p-2.5 z-30">
                <div className="text-[11px] font-semibold text-gray-600 mb-1.5">Highlight Color</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {HIGHLIGHT_COLORS.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (h.value) {
                          editor.chain().focus().setHighlight({ color: h.value }).run()
                        } else {
                          editor.chain().focus().unsetHighlight().run()
                        }
                        setOpenMenu(null)
                      }}
                      title={h.label}
                      style={{ backgroundColor: h.value || '#FFFFFF' }}
                      className="h-6 rounded border border-gray-300 flex items-center justify-center text-[10px] hover:scale-105 transition-transform cursor-pointer"
                    >
                      {!h.value && 'None'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Align Left"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer ${editor.isActive({ textAlign: 'left' }) ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faAlignLeft} className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Align Center"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer ${editor.isActive({ textAlign: 'center' }) ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faAlignCenter} className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Align Right"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer ${editor.isActive({ textAlign: 'right' }) ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faAlignRight} className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            title="Justify"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer ${editor.isActive({ textAlign: 'justify' }) ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faAlignJustify} className="w-3 h-3" />
          </button>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bulleted List"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer ${isBulletList ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faListUl} className="w-3 h-3" />
          </button>
          {/* Numbered List with Dropdown */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List (Click to toggle)"
              className={`h-7 px-1.5 rounded-l flex items-center justify-center cursor-pointer ${isOrderedList ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              <FontAwesomeIcon icon={faListOl} className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomStartInput(String(suggestedStart))
                toggleMenu('orderedList')
              }}
              title="List Numbering Options (Continue numbering / Set start number)"
              className={`h-7 px-1 rounded-r flex items-center justify-center cursor-pointer border-l border-gray-300/60 ${openMenu === 'orderedList' || isOrderedList ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <FontAwesomeIcon icon={faChevronDown} className="w-2 h-2" />
            </button>

            {openMenu === 'orderedList' && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-md shadow-lg py-1.5 z-30">
                <div className="px-3 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  List Numbering
                </div>

                {/* Continue numbering from previous list */}
                <button
                  type="button"
                  onClick={() => applyOrderedListStart(suggestedStart)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex items-center justify-between cursor-pointer text-blue-700 font-semibold"
                >
                  <div className="flex flex-col">
                    <span>Continue Numbering</span>
                    <span className="text-[10px] text-gray-500 font-normal">Auto-picks next number</span>
                  </div>
                  <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                    Start at {suggestedStart}
                  </span>
                </button>

                {/* Restart at 1 */}
                <button
                  type="button"
                  onClick={() => applyOrderedListStart(1)}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs flex items-center justify-between cursor-pointer text-gray-700"
                >
                  <span>Restart Numbering</span>
                  <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                    Start at 1
                  </span>
                </button>

                {/* Quick presets */}
                <div className="px-3 pt-2 pb-1 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                  Quick start number
                </div>
                <div className="grid grid-cols-5 gap-1 px-3 pb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => applyOrderedListStart(n)}
                      className={`h-6 rounded border text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                        (isOrderedList && currentStartNumber === n)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Custom start number input */}
                <div className="border-t border-gray-100 px-3 pt-2 pb-1">
                  <div className="text-[11px] text-gray-600 font-medium mb-1.5">Set starting number:</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={customStartInput}
                      onChange={(e) => setCustomStartInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          applyOrderedListStart(customStartInput)
                        }
                      }}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => applyOrderedListStart(customStartInput)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Checklist / Task List"
            className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer ${isTaskList ? 'bg-[#D3E3FD] text-[#041E49]' : 'hover:bg-gray-200 text-gray-700'}`}
          >
            <FontAwesomeIcon icon={faTasks} className="w-3 h-3" />
          </button>

          {/* Indent / Outdent */}
          <button
            type="button"
            onClick={handleDecreaseIndent}
            title="Decrease Indent (Shift+Tab)"
            className="w-7 h-7 rounded hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-700 cursor-pointer"
          >
            <FontAwesomeIcon icon={faOutdent} className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleIncreaseIndent}
            title="Increase Indent (Tab)"
            className="w-7 h-7 rounded hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-700 cursor-pointer"
          >
            <FontAwesomeIcon icon={faIndent} className="w-3 h-3" />
          </button>

          <div className="h-5 w-[1px] bg-gray-300 mx-1" />

          {/* Table Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('table')}
              title="Table"
              className={`h-7 px-2 rounded flex items-center gap-1.5 cursor-pointer ${isTable ? 'bg-[#D3E3FD] text-[#041E49] font-semibold' : 'hover:bg-gray-200 text-gray-700'}`}
            >
              <FontAwesomeIcon icon={faTable} className="w-3 h-3" />
              <span className="text-[11px]">Table</span>
              <FontAwesomeIcon icon={faChevronDown} className="w-2 h-2 text-gray-400" />
            </button>

            {openMenu === 'table' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30">
                {!isTable ? (
                  <>
                    <div className="px-3 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Insert Table
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
                        setOpenMenu(null)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTable} className="w-3 h-3 text-gray-400" />
                      <span>2 x 2 Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                        setOpenMenu(null)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTable} className="w-3 h-3 text-gray-400" />
                      <span>3 x 3 Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()
                        setOpenMenu(null)
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTable} className="w-3 h-3 text-gray-400" />
                      <span>4 x 4 Table</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Table Controls
                    </div>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addRowBefore().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs cursor-pointer"
                    >
                      Add Row Above
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addRowAfter().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs cursor-pointer"
                    >
                      Add Row Below
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addColumnBefore().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs cursor-pointer"
                    >
                      Add Column Left
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().addColumnAfter().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-xs cursor-pointer"
                    >
                      Add Column Right
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteRow().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 text-xs cursor-pointer"
                    >
                      Delete Row
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteColumn().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 text-xs cursor-pointer"
                    >
                      Delete Column
                    </button>
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().deleteTable().run(); setOpenMenu(null) }}
                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 text-xs font-semibold cursor-pointer"
                    >
                      Delete Table
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Horizontal Line */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Line / Divider"
            className="w-7 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-gray-700 cursor-pointer"
          >
            <FontAwesomeIcon icon={faMinus} className="w-3 h-3" />
          </button>

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear Formatting"
            className="w-7 h-7 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 cursor-pointer"
          >
            <FontAwesomeIcon icon={faEraser} className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ─── Editor Document Canvas ─── */}
      <div className="p-4 bg-white min-h-[160px] cursor-text" onClick={() => editor.commands.focus()}>
        <EditorContent
          editor={editor}
          style={{ minHeight: `${minHeight}px` }}
          className="prose prose-sm max-w-none text-black outline-none leading-relaxed [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-4 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:mb-1.5 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:mb-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:mb-2 [&_.ProseMirror_li]:mb-0.5 [&_.ProseMirror_li_p]:!ml-0 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:border [&_.ProseMirror_table]:border-gray-300 [&_.ProseMirror_table]:my-3 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:font-bold [&_.ProseMirror_th]:text-left [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_ul[data-type='taskList']]:list-none [&_.ProseMirror_ul[data-type='taskList']]:p-0 [&_.ProseMirror_li[data-type='taskItem']]:flex [&_.ProseMirror_li[data-type='taskItem']]:items-center [&_.ProseMirror_li[data-type='taskItem']]:gap-2 [&_.ProseMirror_li[data-type='taskItem']]:mb-1 [&_.ProseMirror_hr]:border-gray-300 [&_.ProseMirror_hr]:my-4"
        />
      </div>
    </div>
  )
}

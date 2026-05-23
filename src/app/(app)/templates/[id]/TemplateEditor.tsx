'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, Upload, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Bold,
  Type, Eye, Image as ImageIcon, AlertCircle, Loader2, CheckCircle, X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { saveTemplateAction, uploadBackgroundAction } from '../actions'
import type { FieldPlacement } from '@/lib/pdf'

// Field types the user can drop on the canvas. Each has a default style so
// "Add Recipient name" produces something legible the moment it's placed.
interface FieldKindDef {
  key:      string
  label:    string
  preview:  string                  // shown in the canvas before real data is rendered
  defaults: Partial<FieldPlacement>
}
const FIELD_KINDS: FieldKindDef[] = [
  { key: 'header',           label: 'Header text',     preview: 'This is to certify that',
    defaults: { fontSize: 14, font: 'sans',  align: 'center' } },
  { key: 'recipientName',    label: 'Recipient name',  preview: 'Recipient Name',
    defaults: { fontSize: 42, font: 'serif', align: 'center', bold: true } },
  { key: 'subheader',        label: 'Subheader text',  preview: 'has successfully completed',
    defaults: { fontSize: 14, font: 'sans',  align: 'center' } },
  { key: 'course',           label: 'Course / topic',  preview: 'Course Name',
    defaults: { fontSize: 26, font: 'serif', align: 'center' } },
  { key: 'competition',      label: 'Competition',     preview: 'Competition Name',
    defaults: { fontSize: 22, font: 'serif', align: 'center' } },
  { key: 'duration',         label: 'Duration',        preview: '12 weeks',
    defaults: { fontSize: 13, font: 'sans',  align: 'center' } },
  { key: 'grade',            label: 'Grade / Result',  preview: 'A+',
    defaults: { fontSize: 14, font: 'sans',  align: 'center' } },
  { key: 'durationAndGrade', label: 'Duration · Grade',preview: '12 WEEKS · A+',
    defaults: { fontSize: 12, font: 'sans',  align: 'center' } },
  { key: 'issuedDate',       label: 'Issue date',      preview: '14 May 2026',
    defaults: { fontSize: 12, font: 'sans',  align: 'center' } },
  { key: 'institution',      label: 'Institution name',preview: 'Your Institution',
    defaults: { fontSize: 12, font: 'sans',  align: 'left' } },
  { key: 'certId',           label: 'Certificate ID',  preview: 'AB3C4D5E6F7G',
    defaults: { fontSize: 10, font: 'mono',  align: 'center' } },
  { key: 'custom',           label: 'Static text',     preview: 'Your text here',
    defaults: { fontSize: 14, font: 'sans',  align: 'center', text: 'Static text' } },
]

interface Props {
  id:                 string
  initialName:        string
  initialBackground:  string | null
  initialFields:      FieldPlacement[]
  initialPageWidth:   number
  initialPageHeight:  number
  certificatesIssued: number
}

export function TemplateEditor(props: Props) {
  const router = useRouter()
  const [name,       setName]       = useState(props.initialName)
  const [background, setBackground] = useState<string | null>(props.initialBackground)
  const [fields,     setFields]     = useState<FieldPlacement[]>(
    props.initialFields.length > 0 ? props.initialFields : DEFAULT_LAYOUT,
  )
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [showSample,  setShowSample]  = useState(true)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [savedAt,     setSavedAt]     = useState<Date | null>(null)
  const [isPending,   startTransition] = useTransition()

  const canvasRef = useRef<HTMLDivElement>(null)
  // The dragging field's index, plus the offset from its top-left where the
  // user grabbed it (so the field doesn't jump under the cursor).
  const drag = useRef<{ idx: number; offsetX: number; offsetY: number } | null>(null)

  // ─── Drag-to-reposition ──────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - drag.current.offsetX
      const y = e.clientY - rect.top  - drag.current.offsetY
      const xNorm = clamp(x / rect.width,  0, 1)
      const yNorm = clamp(y / rect.height, 0, 1)
      setFields(prev => prev.map((f, i) => i === drag.current!.idx ? { ...f, xNorm, yNorm } : f))
    }
    function onUp() { drag.current = null; document.body.style.cursor = '' }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [])

  function startDrag(idx: number, e: React.PointerEvent) {
    if (!canvasRef.current) return
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    drag.current = {
      idx,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    document.body.style.cursor = 'grabbing'
    setSelectedIdx(idx)
    e.preventDefault()
  }

  // ─── Add / remove / mutate fields ────────────────────────────────────────
  function addField(kind: FieldKindDef) {
    const newField: FieldPlacement = {
      key:   kind.key,
      ...kind.defaults,
      xNorm: 0.5,
      yNorm: 0.5,
    }
    setFields(prev => [...prev, newField])
    setSelectedIdx(fields.length)   // new field's index is the old length
  }
  function updateSelected(patch: Partial<FieldPlacement>) {
    if (selectedIdx == null) return
    setFields(prev => prev.map((f, i) => i === selectedIdx ? { ...f, ...patch } : f))
  }
  function deleteSelected() {
    if (selectedIdx == null) return
    setFields(prev => prev.filter((_, i) => i !== selectedIdx))
    setSelectedIdx(null)
  }

  const selected = selectedIdx != null ? fields[selectedIdx] : null

  // ─── Background upload ───────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    const fd = new FormData()
    fd.set('id', props.id)
    fd.set('file', file)
    startTransition(async () => {
      const res = await uploadBackgroundAction(fd)
      if (res.error) { setUploadError(res.error); return }
      // Re-read the data URL from the file we just picked to update the preview
      // without forcing a route refresh (faster UX).
      const reader = new FileReader()
      reader.onloadend = () => {
        setBackground(typeof reader.result === 'string' ? reader.result : null)
      }
      reader.readAsDataURL(file)
    })
  }

  // ─── Save ────────────────────────────────────────────────────────────────
  function save() {
    setSaveError(null)
    const fd = new FormData()
    fd.set('id', props.id)
    fd.set('name', name)
    fd.set('pageWidth',  String(props.initialPageWidth))
    fd.set('pageHeight', String(props.initialPageHeight))
    fd.set('fields', JSON.stringify(fields))
    startTransition(async () => {
      const res = await saveTemplateAction(fd)
      if (res.error) { setSaveError(res.error); return }
      setSavedAt(new Date())
      router.refresh()
    })
  }

  // ─── Layout ──────────────────────────────────────────────────────────────
  const aspect = useMemo(() => props.initialPageWidth / props.initialPageHeight, [
    props.initialPageWidth, props.initialPageHeight,
  ])

  return (
    <>
      {/* Top bar — name + save */}
      <header className="bg-bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex-1 min-w-0">
          <label className="block">
            <span className="text-[10px] font-bold text-ink-mute uppercase tracking-widest">Template name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full text-xl font-serif font-bold bg-transparent border-b border-transparent hover:border-border focus-ring focus:border-brand/60 transition-colors outline-none"
            />
          </label>
          <p className="text-[11px] text-ink-dim mt-1">
            {props.certificatesIssued} certificate{props.certificatesIssued !== 1 ? 's' : ''} issued under this template.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !saveError && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-success">
              <CheckCircle className="w-3.5 h-3.5" /> Saved {timeAgo(savedAt)}
            </span>
          )}
          {saveError && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-danger">
              <AlertCircle className="w-3.5 h-3.5" /> {saveError}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-brand text-bg font-bold px-4 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[260px_1fr_280px] gap-5">
        {/* ── LEFT — field palette ─────────────────────────────────────── */}
        <aside className="bg-bg-card border border-border rounded-2xl p-4 space-y-2 h-fit">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-ink-mute px-1 pb-1">
            Add field
          </h3>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {FIELD_KINDS.map(k => (
              <button
                key={k.key}
                type="button"
                onClick={() => addField(k)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg border border-border-soft hover:border-brand/40 hover:bg-bg-soft transition-colors focus-ring"
              >
                <Plus className="w-3.5 h-3.5 text-brand shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{k.label}</div>
                  <div className="text-[10px] text-ink-dim truncate">{k.preview}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-dim px-1 pt-2 border-t border-border">
            Click a field to add it. Drag it on the canvas to reposition. Click to edit its style.
          </p>
        </aside>

        {/* ── CENTER — canvas ───────────────────────────────────────────── */}
        <section className="bg-bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-ink-mute">Canvas</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-bold border border-border-soft hover:border-brand/40 hover:text-brand px-3 py-1.5 rounded-md transition-colors focus-ring"
              >
                <Upload className="w-3.5 h-3.5" />
                {background ? 'Replace background' : 'Upload background'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={onPickFile}
              />
              <button
                type="button"
                onClick={() => setShowSample(s => !s)}
                title="Toggle sample preview text"
                className={clsx(
                  'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md transition-colors focus-ring',
                  showSample ? 'bg-brand/10 border border-brand/40 text-brand' : 'border border-border-soft hover:border-brand/40',
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger">
              <AlertCircle className="w-3.5 h-3.5" />
              {uploadError}
            </div>
          )}

          <div
            ref={canvasRef}
            className="relative w-full mx-auto rounded-lg overflow-hidden border-2 border-dashed border-border bg-[#fdfaef]"
            style={{ aspectRatio: aspect }}
            onPointerDown={e => {
              // Click on empty canvas = deselect.
              if (e.target === e.currentTarget) setSelectedIdx(null)
            }}
          >
            {background ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={background}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              />
            ) : (
              <ParchmentPlaceholder />
            )}

            {fields.map((f, i) => (
              <FieldChip
                key={i}
                field={f}
                idx={i}
                selected={i === selectedIdx}
                showSample={showSample}
                onPointerDown={e => startDrag(i, e)}
              />
            ))}
          </div>

          <p className="text-[11px] text-ink-dim">
            Page: {props.initialPageWidth} × {props.initialPageHeight} pt ·
            {' '}Drag a chip to reposition. PDF position is normalized so it scales to any page size.
          </p>
        </section>

        {/* ── RIGHT — properties ────────────────────────────────────────── */}
        <aside className="bg-bg-card border border-border rounded-2xl p-4 h-fit">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-ink-mute mb-3">Field style</h3>
          {selected ? (
            <PropsPanel
              field={selected}
              onChange={updateSelected}
              onDelete={deleteSelected}
            />
          ) : (
            <div className="text-center py-8 px-2">
              <Type className="w-6 h-6 mx-auto text-ink-dim mb-2" />
              <p className="text-xs text-ink-mute">Select a field on the canvas to edit its style.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

// ─── Field chip on canvas ─────────────────────────────────────────────────

function FieldChip({
  field, idx, selected, showSample, onPointerDown,
}: {
  field:    FieldPlacement
  idx:      number
  selected: boolean
  showSample: boolean
  onPointerDown: (e: React.PointerEvent) => void
}) {
  // Canvas size in CSS px is unknown — we use percentages so it stays correct.
  const leftPct = field.xNorm * 100
  const topPct  = field.yNorm * 100
  const fontPx  = Math.max(8, (field.fontSize ?? 14) * 1.15)    // 1.15 fudge factor approximates pt → px

  const text = showSample
    ? FIELD_KINDS.find(k => k.key === field.key)?.preview ?? (field.text ?? field.key)
    : `[${FIELD_KINDS.find(k => k.key === field.key)?.label ?? field.key}]`

  const transform =
    field.align === 'center' ? 'translate(-50%, 0)' :
    field.align === 'right'  ? 'translate(-100%, 0)' :
                                'translate(0, 0)'

  return (
    <div
      data-field-idx={idx}
      onPointerDown={onPointerDown}
      onClick={e => e.stopPropagation()}
      style={{
        position:   'absolute',
        left:       `${leftPct}%`,
        top:        `${topPct}%`,
        transform,
        fontSize:   `${fontPx}px`,
        fontFamily: field.font === 'mono' ? 'JetBrains Mono, monospace'
                    : field.font === 'sans' ? 'Inter, sans-serif'
                    : 'Fraunces, Georgia, serif',
        color:      field.color ?? '#0a0e1a',
        fontWeight: field.bold ? 700 : 400,
        whiteSpace: 'nowrap',
        cursor:     'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      className={clsx(
        'px-1.5 py-0.5 rounded transition-shadow',
        selected
          ? 'outline outline-2 outline-brand outline-offset-2 shadow-lg shadow-brand-900/30 bg-brand/5'
          : 'hover:bg-brand/5 hover:outline hover:outline-1 hover:outline-brand/40',
      )}
    >
      {text}
    </div>
  )
}

// ─── Properties panel ──────────────────────────────────────────────────────

function PropsPanel({
  field, onChange, onDelete,
}: {
  field: FieldPlacement
  onChange: (patch: Partial<FieldPlacement>) => void
  onDelete: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs">
        <span className="font-bold">{FIELD_KINDS.find(k => k.key === field.key)?.label ?? field.key}</span>
      </div>

      {field.key === 'custom' && (
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Text</span>
          <input
            value={field.text ?? ''}
            onChange={e => onChange({ text: e.target.value })}
            className="mt-1 w-full px-2.5 py-1.5 bg-bg border border-border rounded-md text-sm focus-ring focus:border-brand/60"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Size</span>
          <input
            type="number" min={6} max={120}
            value={field.fontSize ?? 14}
            onChange={e => onChange({ fontSize: Math.max(6, Math.min(120, Number(e.target.value))) })}
            className="mt-1 w-full px-2.5 py-1.5 bg-bg border border-border rounded-md text-sm focus-ring focus:border-brand/60"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Font</span>
          <select
            value={field.font ?? 'sans'}
            onChange={e => onChange({ font: e.target.value as FieldPlacement['font'] })}
            className="mt-1 w-full px-2 py-1.5 bg-bg border border-border rounded-md text-sm focus-ring focus:border-brand/60 cursor-pointer"
          >
            <option value="serif">Serif</option>
            <option value="sans">Sans</option>
            <option value="mono">Mono</option>
          </select>
        </label>
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Align</span>
        <div className="mt-1 flex border border-border rounded-md overflow-hidden">
          <AlignBtn icon={AlignLeft}   active={field.align === 'left'   || !field.align} onClick={() => onChange({ align: 'left' })} />
          <AlignBtn icon={AlignCenter} active={field.align === 'center'} onClick={() => onChange({ align: 'center' })} />
          <AlignBtn icon={AlignRight}  active={field.align === 'right'}  onClick={() => onChange({ align: 'right' })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Colour</span>
          <input
            type="color"
            value={field.color ?? '#0a0e1a'}
            onChange={e => onChange({ color: e.target.value })}
            className="mt-1 w-full h-9 bg-bg border border-border rounded-md focus-ring focus:border-brand/60 cursor-pointer"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">Bold</span>
          <button
            type="button"
            onClick={() => onChange({ bold: !field.bold })}
            className={clsx(
              'mt-1 h-9 border rounded-md inline-flex items-center justify-center transition-colors focus-ring',
              field.bold
                ? 'bg-brand/10 border-brand/40 text-brand'
                : 'border-border hover:border-brand/40',
            )}
          >
            <Bold className="w-4 h-4" />
          </button>
        </label>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute mb-1">Position</div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div>x: {Math.round(field.xNorm * 100)}%</div>
          <div>y: {Math.round(field.yNorm * 100)}%</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-danger border border-danger/30 hover:bg-danger/10 px-3 py-2 rounded-md transition-colors focus-ring"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete field
      </button>
    </div>
  )
}

function AlignBtn({ icon: Icon, active, onClick }: { icon: typeof AlignLeft; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex-1 py-1.5 inline-flex items-center justify-center transition-colors focus-ring',
        active ? 'bg-brand/15 text-brand' : 'hover:bg-bg-soft',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ParchmentPlaceholder() {
  return (
    <div className="absolute inset-0 grid place-items-center text-ink-dim">
      <div className="text-center pointer-events-none">
        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-xs font-bold uppercase tracking-widest">Default parchment background</p>
        <p className="text-[10px] mt-1">Upload your own to override</p>
      </div>
    </div>
  )
}

const DEFAULT_LAYOUT: FieldPlacement[] = [
  { key: 'header',           xNorm: 0.50, yNorm: 0.18, fontSize: 14, font: 'sans',  align: 'center' },
  { key: 'recipientName',    xNorm: 0.50, yNorm: 0.33, fontSize: 42, font: 'serif', align: 'center', bold: true },
  { key: 'subheader',        xNorm: 0.50, yNorm: 0.42, fontSize: 14, font: 'sans',  align: 'center' },
  { key: 'course',           xNorm: 0.50, yNorm: 0.52, fontSize: 26, font: 'serif', align: 'center' },
  { key: 'durationAndGrade', xNorm: 0.50, yNorm: 0.61, fontSize: 13, font: 'sans',  align: 'center' },
]

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime()
  if (ms < 60_000) return 'just now'
  return `${Math.floor(ms / 60_000)} min ago`
}

/**
 * Certificate PDF generator.
 *
 * Composes a certificate row into a fully-formed PDF:
 *   • A4 landscape page
 *   • Optional template background image
 *   • Recipient name, course, dates rendered in Fraunces-like serif
 *   • Pramaan footer with the certificate ID
 *   • A QR code in the bottom-right that points at /v/<id>
 *
 * Pure function — returns a Uint8Array — no filesystem writes. The caller
 * decides whether to stream it to the browser, persist to S3, or zip it.
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'

interface FieldPlacement {
  key:       string
  x:         number     // points from left, 0 = left edge
  y:         number     // points from BOTTOM (pdf-lib convention)
  fontSize?: number     // default 14
  font?:     'serif' | 'sans' | 'mono'
  align?:    'left' | 'center' | 'right'
  maxWidth?: number     // truncate / wrap at this width
}

export interface RenderInput {
  id:              string
  recipientName:   string
  course?:         string | null
  duration?:       string | null
  competitionName?: string | null
  grade?:          string | null
  issuedAt:        Date
  validUntil?:     Date | null
  institutionName: string
  // URL to the QR target — e.g. https://pramaan.in/v/abc123. Encoded INTO
  // the QR code so anyone scanning it lands on the verification page.
  verifyUrl:       string
  // Page geometry in points (1 pt = 1/72"). Default A4 landscape.
  pageWidth?:      number
  pageHeight?:     number
  // Optional template background image (PNG or JPEG bytes).
  backgroundBytes?: Uint8Array
  // Optional field placements. If not provided, we fall back to a sensible
  // built-in layout that works without a template background.
  fields?:         FieldPlacement[]
}

const DEFAULT_W = 842   // A4 landscape width  in pt
const DEFAULT_H = 595   // A4 landscape height in pt
const QR_SIZE   = 80    // pt — small enough not to dominate, big enough to scan

export async function renderCertificatePdf(input: RenderInput): Promise<Uint8Array> {
  const W = input.pageWidth  ?? DEFAULT_W
  const H = input.pageHeight ?? DEFAULT_H

  const pdf  = await PDFDocument.create()
  const page = pdf.addPage([W, H])

  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const sans  = await pdf.embedFont(StandardFonts.Helvetica)
  const mono  = await pdf.embedFont(StandardFonts.Courier)

  function fontFor(f?: FieldPlacement['font'], bold = false) {
    if (f === 'mono') return mono
    if (f === 'sans') return sans
    return bold ? serifBold : serif
  }

  // 1) Background — either the template's uploaded image, or a tasteful
  //    cream-on-cream parchment look generated programmatically.
  if (input.backgroundBytes) {
    try {
      const img = await tryEmbedImage(pdf, input.backgroundBytes)
      if (img) {
        const dims = img.scaleToFit(W, H)
        page.drawImage(img, {
          x: (W - dims.width)  / 2,
          y: (H - dims.height) / 2,
          width:  dims.width,
          height: dims.height,
        })
      } else {
        drawParchment(page, W, H)
      }
    } catch {
      drawParchment(page, W, H)
    }
  } else {
    drawParchment(page, W, H)
  }

  // 2) Field overlay. Use caller-provided fields if present, else a sensible
  //    default layout.
  const fields: FieldPlacement[] = input.fields ?? [
    { key: 'header',          x: W / 2, y: H - 110, fontSize: 14, font: 'sans',  align: 'center' },
    { key: 'recipientName',   x: W / 2, y: H - 200, fontSize: 42, font: 'serif', align: 'center' },
    { key: 'subheader',       x: W / 2, y: H - 250, fontSize: 14, font: 'sans',  align: 'center' },
    { key: 'course',          x: W / 2, y: H - 305, fontSize: 26, font: 'serif', align: 'center' },
    { key: 'duration',        x: W / 2, y: H - 350, fontSize: 13, font: 'sans',  align: 'center' },
  ]

  const valueFor = (key: string): string => {
    switch (key) {
      case 'header':        return 'This is to certify that'
      case 'subheader':     return input.competitionName
        ? 'participated in'
        : 'has successfully completed the course on'
      case 'recipientName': return input.recipientName
      case 'course':        return input.course ?? input.competitionName ?? ''
      case 'duration':      return [input.duration, input.grade]
        .filter(Boolean).map(s => String(s).toUpperCase()).join('  ·  ')
      default:              return ''
    }
  }

  for (const f of fields) {
    const value = valueFor(f.key).trim()
    if (!value) continue
    const fSize = f.fontSize ?? 14
    const font  = fontFor(f.font, fSize >= 24)
    const width = font.widthOfTextAtSize(value, fSize)
    let drawX = f.x
    if (f.align === 'center') drawX = f.x - width / 2
    if (f.align === 'right')  drawX = f.x - width
    page.drawText(value, {
      x: drawX,
      y: f.y,
      size: fSize,
      font,
      color: rgb(0.07, 0.08, 0.15),
    })
  }

  // 3) Footer band — issuer + issued date on the left, ID + QR on the right.
  const footerY = 60
  page.drawRectangle({
    x: 30, y: footerY - 12, width: W - 60, height: 1,
    color: rgb(0.65, 0.5, 0.1),
  })

  page.drawText(`Issued by ${input.institutionName}`, {
    x: 40, y: footerY,
    size: 11, font: sans, color: rgb(0.07, 0.08, 0.15),
  })
  const issuedLine = `on ${input.issuedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
  page.drawText(issuedLine, {
    x: 40, y: footerY - 16,
    size: 9, font: sans, color: rgb(0.3, 0.3, 0.35),
  })
  if (input.validUntil) {
    page.drawText(
      `valid until ${input.validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      { x: 40, y: footerY - 30, size: 9, font: sans, color: rgb(0.3, 0.3, 0.35) },
    )
  }

  // 4) QR — bottom-right corner. PNG data URL → embed into the PDF.
  const qrPng = await QRCode.toBuffer(input.verifyUrl, {
    type: 'png',
    margin: 1,
    width: 256,
    color: { dark: '#0a0e1a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
  const qrImage = await pdf.embedPng(qrPng)
  const qrX = W - QR_SIZE - 40
  const qrY = footerY - 8
  page.drawImage(qrImage, {
    x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE,
  })
  page.drawText('Scan to verify', {
    x: qrX, y: qrY + QR_SIZE + 4,
    size: 8, font: sans, color: rgb(0.4, 0.4, 0.45),
  })
  // Cert id below QR in mono so anyone can paste it manually.
  const idTxt = `ID · ${input.id.toUpperCase()}`
  const idWidth = mono.widthOfTextAtSize(idTxt, 8)
  page.drawText(idTxt, {
    x: qrX + (QR_SIZE - idWidth) / 2,
    y: qrY - 12,
    size: 8, font: mono, color: rgb(0.55, 0.4, 0.05),
  })

  return await pdf.save()
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function tryEmbedImage(pdf: PDFDocument, bytes: Uint8Array) {
  // Try PNG first (most common), fall back to JPEG.
  try { return await pdf.embedPng(bytes) } catch {}
  try { return await pdf.embedJpg(bytes) } catch {}
  return null
}

/**
 * Default certificate background — drawn programmatically so even
 * institutions without a custom template get something that looks like an
 * actual certificate, not a Word document. Cream paper + saffron rules.
 */
function drawParchment(page: PDFPage, W: number, H: number) {
  // Cream paper base
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.99, 0.97, 0.93) })
  // Outer saffron rule
  const m = 26
  page.drawRectangle({
    x: m, y: m, width: W - 2 * m, height: H - 2 * m,
    borderColor: rgb(0.96, 0.62, 0.04),
    borderWidth: 3,
    color: rgb(0.99, 0.97, 0.93),
  })
  // Inner thin rule
  page.drawRectangle({
    x: m + 6, y: m + 6, width: W - 2 * (m + 6), height: H - 2 * (m + 6),
    borderColor: rgb(0.84, 0.55, 0.04),
    borderWidth: 0.5,
    color: undefined,
  })
  // Decorative corner dots
  const dotR = 3
  const corners: [number, number][] = [
    [m + 14, m + 14], [W - m - 14, m + 14], [m + 14, H - m - 14], [W - m - 14, H - m - 14],
  ]
  for (const [cx, cy] of corners) {
    page.drawCircle({ x: cx, y: cy, size: dotR, color: rgb(0.96, 0.62, 0.04) })
  }
  // "PRAMAAN" wordmark at the top
  // (use Helvetica — Pramaan-the-brand mark, not the certificate body copy)
  // We can't load Inter here without bundling its bytes; using StandardFonts keeps
  // the PDF tiny and dependency-free.
}

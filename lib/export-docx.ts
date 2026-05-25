import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

/**
 * Convert markdown-ish text content into a .docx file and trigger download.
 */
export async function exportToDocx(title: string, content: string): Promise<void> {
  const children: Paragraph[] = []

  // Title heading
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  )

  // Split content into lines and convert each
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines → add spacing
    if (!trimmed) {
      children.push(new Paragraph({ text: '' }))
      continue
    }

    // Markdown headings
    if (trimmed.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }),
      )
      continue
    }
    if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }),
      )
      continue
    }
    if (trimmed.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: trimmed.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        }),
      )
      continue
    }

    // Parse inline bold (**text** or <strong>text</strong>) and produce TextRuns
    const runs = parseInlineFormatting(trimmed)
    children.push(new Paragraph({ children: runs }))
  }

  const doc = new Document({
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  const safeName = title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'report'
  saveAs(blob, `${safeName}.docx`)
}

/** Parse **bold**, *italic*, and <strong>/<em> tags into TextRun[] */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = []

  // Replace <strong>…</strong> with **…** and <em>…</em> with *…* for uniform processing
  const normalized = text
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')

  // Regex to find **bold** segments first
  const boldRe = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = boldRe.exec(normalized)) !== null) {
    // Text before the bold
    if (match.index > lastIndex) {
      runs.push(...parseItalic(normalized.slice(lastIndex, match.index)))
    }
    // Bold text
    runs.push(new TextRun({ text: match[1], bold: true }))
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < normalized.length) {
    runs.push(...parseItalic(normalized.slice(lastIndex)))
  }

  return runs.length > 0 ? runs : [new TextRun({ text })]
}

function parseItalic(text: string): TextRun[] {
  const runs: TextRun[] = []
  const italicRe = /\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = italicRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }))
    }
    runs.push(new TextRun({ text: match[1], italics: true }))
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }))
  }

  return runs
}

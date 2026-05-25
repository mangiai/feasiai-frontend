import 'html2pdf.js'

declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    pagebreak?: {
      mode?: string | string[]
      before?: string[]
      after?: string[]
      avoid?: string[]
    }
  }
}

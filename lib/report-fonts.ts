import { Cinzel, Source_Serif_4 } from 'next/font/google'

/** Display / headings — inscription-style gothic for report titles */
export const reportDisplayFont = Cinzel({
  subsets: ['latin'],
  variable: '--font-report-display',
  weight: ['400', '600', '700'],
  display: 'swap',
})

/** Body — readable serif for long feasibility narratives */
export const reportBodyFont = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-report-body',
  weight: ['400', '600'],
  display: 'swap',
})

export const reportFontClassName = `${reportDisplayFont.variable} ${reportBodyFont.variable}`

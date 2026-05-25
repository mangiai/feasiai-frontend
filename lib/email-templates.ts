// FeasiAI Email Templates
// Each function returns a complete HTML email string with inline CSS and CAN-SPAM compliance.

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Marketing-site palette (email-safe approximations)
const BRAND_ORANGE = '#F58220' // --secondary
const BRAND_NAVY = '#1B2A5F' // --primary

// Dark, "landing page vibes" shell
const PAGE_BG = '#070A12'
const CARD_BG = '#0B1220'
const CARD_BORDER = 'rgba(255,255,255,0.10)'
const TEXT_MAIN = '#F8FAFC'
const TEXT_MUTED = 'rgba(248,250,252,0.68)'
const TEXT_FAINT = 'rgba(248,250,252,0.46)'

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://feasiai.com'
}

/**
 * Transactional email shell: preheader, 600px card, teal header, mint legal footer.
 * Table-based layout for broad client support; inline styles only.
 */
function layout(title: string, preheader: string, body: string) {
  const preferencesUrl = `${getAppUrl()}/settings/notifications`
  const pre = escapeHtml(preheader)
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css"> table { border-collapse: collapse; } </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;opacity:0;">${pre}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid ${CARD_BORDER};border-radius:16px;overflow:hidden;background-color:${CARD_BG};box-shadow:0 18px 60px rgba(0,0,0,0.45);">
          <tr>
            <td style="padding:0;">
              <div style="height:6px;line-height:6px;background:linear-gradient(90deg, ${BRAND_ORANGE} 0%, #ffb055 30%, #8b5cf6 100%);"></div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:22px 32px 18px 32px;">
                    <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${TEXT_MAIN};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      FeasiAI
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT_MAIN};">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background-color:rgba(255,255,255,0.03);border-top:1px solid rgba(255,255,255,0.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.55;color:${TEXT_FAINT};">
                FeasiAI, 548 Market St, Suite 35435, San Francisco, CA 94104
              </p>
              <p style="margin:0 0 10px;font-size:12px;line-height:1.55;color:${TEXT_FAINT};">
                You received this email because you use FeasiAI or were contacted by another user through the platform.
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="${preferencesUrl}" style="color:${TEXT_MUTED};text-decoration:underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(text: string, url: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr>
      <td align="center" bgcolor="${BRAND_ORANGE}" style="border-radius:12px;background-color:${BRAND_ORANGE};">
        <a href="${url}" style="display:inline-block;padding:14px 28px;background-color:${BRAND_ORANGE};color:#0B1220;font-size:14px;font-weight:800;text-decoration:none;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${escapeHtml(text)}
        </a>
      </td>
    </tr>
  </table>`
}

export function welcomeEmail(name: string): string {
  return layout(
    'Welcome to FeasiAI',
    `Welcome to FeasiAI — get started with your first project.`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_MAIN};line-height:1.35;">Welcome, ${escapeHtml(name)}</p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      Thanks for joining FeasiAI — the platform that helps you move from plans to permit-ready faster.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      Create your first project and upload your plans to get started.
    </p>
    ${ctaButton('Go to dashboard', `${getAppUrl()}/dashboard`)}
  `,
  )
}

export function pipelineCompleteEmail(projectName: string, reportUrl: string): string {
  return layout(
    'Your report is ready',
    `Your analysis for ${projectName} is complete.`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_MAIN};line-height:1.35;">Pipeline complete</p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      The analysis pipeline for <strong>${escapeHtml(projectName)}</strong> has finished. Your report is ready for review.
    </p>
    ${ctaButton('View report', reportUrl)}
  `,
  )
}

export function reportReadyEmail(reportTitle: string, reportUrl: string): string {
  return layout(
    'Report ready for review',
    `${reportTitle} is ready for your review.`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_MAIN};line-height:1.35;">Report ready</p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      <strong>${escapeHtml(reportTitle)}</strong> is ready for your review.
    </p>
    ${ctaButton('Review report', reportUrl)}
  `,
  )
}

export function verificationCompleteEmail(reportTitle: string, status: string): string {
  const statusColor = status === 'passed' ? '#059669' : status === 'failed' ? '#dc2626' : '#d97706'
  return layout(
    'Verification result',
    `Verification ${status} for ${reportTitle}.`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_MAIN};line-height:1.35;">Verification complete</p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      Results for <strong>${escapeHtml(reportTitle)}</strong>:
    </p>
    <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:${statusColor};letter-spacing:0.04em;text-transform:uppercase;">
      ${escapeHtml(status)}
    </p>
    ${ctaButton('Open dashboard', `${getAppUrl()}/dashboard`)}
  `,
  )
}

export function collaborationInviteEmail(inviterName: string, resourceType: string, acceptUrl: string): string {
  return layout(
    'Collaboration invitation',
    `${inviterName} invited you to collaborate on FeasiAI.`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_MAIN};line-height:1.35;">Collaboration invitation</p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      <strong>${escapeHtml(inviterName)}</strong> invited you to collaborate on a ${escapeHtml(resourceType)}.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      Accept to join the workspace experience on this resource.
    </p>
    ${ctaButton('Accept invitation', acceptUrl)}
  `,
  )
}

export function lowCreditsEmail(currentCredits: number, buyUrl: string): string {
  return layout(
    'Credits running low',
    `You have ${currentCredits} credit${currentCredits === 1 ? '' : 's'} left on FeasiAI.`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:${TEXT_MAIN};line-height:1.35;">Credits running low</p>
    <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};line-height:1.65;">
      You have <strong>${escapeHtml(String(currentCredits))}</strong> credit${currentCredits === 1 ? '' : 's'} remaining. Add credits to avoid interruptions.
    </p>
    ${ctaButton('Buy credits', buyUrl)}
  `,
  )
}

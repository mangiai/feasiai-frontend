function isEmailDebugEnabled() {
  return process.env.EMAIL_DEBUG === 'true'
}

function getMailgunSmtpConfig() {
  const host = process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org'
  const port = Number(process.env.MAILGUN_SMTP_PORT || '587')
  const user = process.env.MAILGUN_SMTP_USER
  const pass = process.env.MAILGUN_SMTP_PASS

  const secure =
    typeof process.env.MAILGUN_SMTP_SECURE === 'string'
      ? process.env.MAILGUN_SMTP_SECURE === 'true'
      : port === 465

  return { host, port, secure, auth: user && pass ? { user, pass } : null }
}

let _transporter: any | null = null
let _transporterKey: string | null = null

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const smtp = getMailgunSmtpConfig()
  if (!smtp.auth) {
    console.error('[email] MAILGUN_SMTP_USER/PASS are not set — emails will not be sent')
    return { error: 'Email service not configured' }
  }
  const from = process.env.EMAIL_FROM || 'FeasiAI <noreply@feasiai.com>'

  if (isEmailDebugEnabled()) {
    console.log('[email] sending', {
      provider: 'mailgun_smtp',
      from,
      to,
      subject,
      html_chars: html?.length ?? 0,
      smtp: { host: smtp.host, port: smtp.port, secure: smtp.secure, has_auth: true },
    })
  }

  try {
    const { default: nodemailer } = await import('nodemailer')

    const key = JSON.stringify({ host: smtp.host, port: smtp.port, secure: smtp.secure, user: smtp.auth.user })
    if (!_transporter || _transporterKey !== key) {
      _transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
        connectionTimeout: 20_000,
        socketTimeout: 30_000,
      })
      _transporterKey = key
    }

    const info = await _transporter.sendMail({
      from,
      to,
      subject,
      html,
    })

    if (isEmailDebugEnabled()) {
      console.log('[email] sent ok', {
        messageId: info?.messageId ?? null,
        accepted: (info as any)?.accepted ?? null,
        rejected: (info as any)?.rejected ?? null,
        response: (info as any)?.response ?? null,
      })
    }

    return info
  } catch (err) {
    console.error('[email] send failed', err)
    throw err
  }
}

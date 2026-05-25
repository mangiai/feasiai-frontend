import { WorkspaceInviteClient } from './workspace-invite-client'

/**
 * Server Component: reads [token] from the route reliably (Next.js 15+ params may be async).
 * Passing token as a prop avoids clients seeing `undefined` when dynamic params aren't injected into client-only pages.
 */
export default async function WorkspaceInviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <WorkspaceInviteClient token={token ?? ''} />
}

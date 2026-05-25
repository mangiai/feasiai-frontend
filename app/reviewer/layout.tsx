export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Intentionally unguarded: /reviewer/login must be reachable.
  // Guarded layout lives in /reviewer/(portal)/layout.tsx.
  return children
}


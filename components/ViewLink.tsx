/**
 * A link that becomes plain markup in a read-only view. Parents mirror the
 * student's pages but must not be able to walk into the interactive routes
 * behind them.
 */
export default function ViewLink({
  href,
  readOnly,
  className,
  children,
}: {
  href: string
  readOnly: boolean
  className?: string
  children: React.ReactNode
}) {
  if (readOnly) return <div className={className}>{children}</div>
  return <a href={href} className={className}>{children}</a>
}

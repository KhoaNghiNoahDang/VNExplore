export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M8 32 L32 32 M12 32 L12 24 L28 24 L28 32 M16 24 L16 16 L24 16 L24 24 M18 16 L20 8 L22 16" />
    </svg>
  )
}

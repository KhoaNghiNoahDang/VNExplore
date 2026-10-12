/** The round Dong Son sun emblem (rendered from .codex/vnexplore-dongson-sun.html). */
export default function Logo({ className = '' }: { className?: string }) {
  return <img src="/pwa-192x192.png" alt="" aria-hidden className={`rounded-full ${className}`} />
}

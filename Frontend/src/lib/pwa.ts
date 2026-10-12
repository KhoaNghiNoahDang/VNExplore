import { useEffect, useState } from 'react'

/**
 * Installing VNExplore as an app (PWA), on every platform:
 *  - Chrome / Edge / Samsung Internet / Opera (Android, Windows, macOS, ChromeOS, Linux) fire
 *    `beforeinstallprompt`: we keep it and show the real install dialog from our own button.
 *  - Safari on iPhone/iPad (and every iOS browser) has no install API: Share → Add to Home Screen.
 *  - Safari on macOS: File → Add to Dock. Firefox for Android: menu → Install.
 *    Firefox on desktop cannot install web apps: we suggest Chrome or Edge.
 */

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALLED_KEY = 'vx:pwa-installed'
let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((f) => f())

/** Call once at startup, before React renders: the browser fires the event only once, early. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it for our own button instead of the mini-infobar
    deferred = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    try {
      localStorage.setItem(INSTALLED_KEY, '1')
    } catch {
      /* storage unavailable */
    }
    notify()
  })
}

/** Running as the installed app (home-screen icon / app window), not in a browser tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export type InstallGuide = 'native' | 'ios' | 'mac-safari' | 'android-firefox' | 'android-menu' | 'desktop-menu' | 'unsupported'

/** Which way of installing this browser offers. */
export function installGuide(): InstallGuide {
  if (deferred) return 'native'
  const ua = navigator.userAgent
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  const android = /Android/.test(ua)
  const firefox = /Firefox\//.test(ua)
  if (android) return firefox ? 'android-firefox' : 'android-menu'
  if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua)) return 'mac-safari'
  if (firefox) return 'unsupported'
  return 'desktop-menu'
}

/** Install state for the UI; re-renders when the browser offers (or completes) an install. */
export function usePwaInstall() {
  const [, bump] = useState(0)
  useEffect(() => {
    const f = () => bump((n) => n + 1)
    listeners.add(f)
    return () => {
      listeners.delete(f)
    }
  }, [])
  let installedHere = false
  try {
    installedHere = localStorage.getItem(INSTALLED_KEY) === '1'
  } catch {
    /* storage unavailable */
  }
  return {
    standalone: isStandalone(),
    /** Installed from this browser earlier (the user is now in a tab of the same browser). */
    installedHere,
    guide: installGuide(),
    /** Show the browser's own install dialog. Resolves true when the user accepts. */
    async install(): Promise<boolean> {
      if (!deferred) return false
      const e = deferred
      await e.prompt()
      const { outcome } = await e.userChoice
      deferred = null
      notify()
      return outcome === 'accepted'
    },
  }
}

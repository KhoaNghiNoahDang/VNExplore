import { Camera, ChefHat, Coffee, Compass, GraduationCap, Headphones, Store, type LucideIcon } from 'lucide-react'
import type { Mode } from '../types'

export const MODE_ICON: Record<Mode, LucideIcon> = {
  explore: Compass,
  listen: Headphones,
  easy: Coffee,
}

export const ROLE_ICON: Record<string, LucideIcon> = {
  merchant: Store,
  scholar: GraduationCap,
  photographer: Camera,
  chef: ChefHat,
}

export const TONE_BG: Record<'brick' | 'butter' | 'teal' | 'leaf', string> = {
  brick: 'bg-brick/15 text-brick',
  butter: 'bg-butter text-bark',
  teal: 'bg-teal/15 text-teal',
  leaf: 'bg-leaf/15 text-leaf',
}

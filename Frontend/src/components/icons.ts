import {
  BookOpen,
  Camera,
  ChefHat,
  Coffee,
  Compass,
  GraduationCap,
  Headphones,
  Leaf,
  Music,
  NotebookPen,
  Newspaper,
  Palette,
  Ruler,
  Store,
  TreePine,
  type LucideIcon,
} from 'lucide-react'
import type { Mode } from '../types'

export const MODE_ICON: Record<Mode, LucideIcon> = {
  explore: Compass,
  listen: Headphones,
  easy: Coffee,
}

const ICONS: Record<string, LucideIcon> = {
  merchant: Store,
  scholar: GraduationCap,
  photographer: Camera,
  chef: ChefHat,
  reporter: Newspaper,
  architect: Ruler,
  storyteller: BookOpen,
  painter: Palette,
  'food-writer': NotebookPen,
  performer: Music,
  botanist: Leaf,
  'forest-keeper': TreePine,
}

/** Icon per role id; a role added in the sheet without an icon here gets the Explore compass. */
export const ROLE_ICON: Record<string, LucideIcon> = new Proxy(ICONS, {
  get: (icons, id: string) => icons[id] ?? Compass,
})

export const TONE_BG: Record<'brick' | 'butter' | 'teal' | 'leaf', string> = {
  brick: 'bg-brick/15 text-brick',
  butter: 'bg-butter text-bark',
  teal: 'bg-teal/15 text-teal',
  leaf: 'bg-leaf/15 text-leaf',
}

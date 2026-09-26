import { Pencil } from 'lucide-react'
import { THEME_LABEL } from '../i18n/strings'
import { useQuest } from '../store/QuestContext'
import type { Intent } from '../types'

/** The tags read from the request. `onEdit` turns them into edit buttons (Places screen). */
export default function IntentChips({ intent, onEdit }: { intent: Intent; onEdit?: () => void }) {
  const { lang, t } = useQuest()

  const chips = [
    ...intent.themes.map((th) => ({ label: THEME_LABEL[lang][th], muted: false })),
    { label: t.people(intent.people), muted: false },
    ...(intent.budget === 'low' ? [{ label: t.budgetFriendly, muted: false }] : []),
    {
      label: intent.hoursIsDefault ? `${t.hours(intent.hours)} · ${t.defaultSuffix}` : t.hours(intent.hours),
      muted: intent.hoursIsDefault,
    },
  ]

  if (onEdit) {
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            onClick={onEdit}
            title={t.editHint}
            className="inline-flex items-center gap-1 rounded border border-sand bg-butter px-2 py-1 text-[10px] font-bold hover:bg-sand"
          >
            {c.label} <Pencil className="h-2.5 w-2.5" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={c.label}
          className={
            c.muted
              ? 'rounded-md border border-sand bg-butter px-3 py-1 text-[10px] font-bold text-bark'
              : 'rounded-md bg-teal/10 px-3 py-1 text-[10px] font-bold text-teal'
          }
        >
          {c.label}
        </span>
      ))}
    </div>
  )
}

import { LegalContent } from '../components/Legal'
import TopBar from '../components/TopBar'
import { LEGAL, type LegalKind } from '../i18n/legal'
import { useQuest } from '../store/QuestContext'

/** /terms and /privacy: linkable pages for the terms of use and the privacy policy. */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useQuest()
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" />
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-10">
        <h1 className="mb-3 mt-2 text-[24px] font-extrabold leading-tight">{LEGAL[lang][kind].title}</h1>
        <LegalContent kind={kind} />
      </div>
    </div>
  )
}

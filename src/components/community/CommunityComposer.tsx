import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, MessageSquarePlus, Sparkles, UsersRound, Wrench } from 'lucide-react'
import { Button } from '../ui/Button'
import type { CommunityGroup } from '../../data/communitySeed'
import type { ComposerPrefill } from './communityTypes'
import { useI18n } from '../../i18n/useI18n'
import { getProductCopy } from '../../i18n/productCopy'

type ComposerSubmitPayload = {
  title: string
  groupId: string
  body: string
  tags: string[]
  linkedProblem?: string
}

type CommunityComposerProps = {
  groups: CommunityGroup[]
  open: boolean
  prefill?: ComposerPrefill | null
  onClose: () => void
  onSubmit: (payload: ComposerSubmitPayload) => void
}

function buildInitialDraft(prefill?: ComposerPrefill | null) {
  return {
    title: prefill?.title ?? '',
    groupId: prefill?.groupId ?? 'debugging-help',
    body: prefill?.body ?? '',
    tags: prefill?.tags?.join(', ') ?? '',
    linkedProblem: prefill?.linkedProblem ?? '',
  }
}

export function CommunityComposer({ groups, open, prefill, onClose, onSubmit }: CommunityComposerProps) {
  const { lang } = useI18n()
  const copy = getProductCopy(lang).community?.ui?.composer
  const quickTypes = [
    { id: 'debug', label: copy.quickDebug, icon: Wrench },
    { id: 'insight', label: copy.quickInsight, icon: Sparkles },
    { id: 'partners', label: copy.quickPartners, icon: UsersRound },
  ] as const

  const [draft, setDraft] = useState(() => buildInitialDraft(prefill))

  useEffect(() => {
    if (open) setDraft(buildInitialDraft(prefill))
  }, [open, prefill])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const canSubmit = useMemo(() => draft.title.trim().length >= 8 && draft.body.trim().length >= 24, [draft.body, draft.title])

  if (!open) return null

  const portalHost = document.getElementById('pebble-portal') ?? document.body

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/38 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="community-panel-float relative z-10 w-full max-w-[720px] rounded-[28px] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">{copy.title}</p>
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-pebble-text-primary">{copy.title}</h2>
            <p className="max-w-[48ch] text-[13.5px] leading-[1.7] text-pebble-text-secondary">{copy.body}</p>
          </div>
          <button type="button" onClick={onClose} className="community-chip-muted inline-flex h-10 w-10 items-center justify-center rounded-2xl" aria-label={copy.close}>
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {quickTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === 'debug') setDraft((current) => ({ ...current, groupId: 'debugging-help', title: current.title || copy.titlePlaceholder }))
                if (id === 'insight') setDraft((current) => ({ ...current, groupId: 'dsa-strategy', title: current.title || copy.quickInsight }))
                if (id === 'partners') setDraft((current) => ({ ...current, groupId: 'project-partners', title: current.title || copy.quickPartners }))
              }}
              className="community-chip-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-medium"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{copy.titleLabel}</span>
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="community-input h-11 w-full rounded-2xl px-3 text-[14px]" placeholder={copy.titlePlaceholder} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{copy.bodyLabel}</span>
              <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} className="community-input min-h-[140px] w-full rounded-[22px] px-3 py-3 text-[14px] leading-[1.65]" placeholder={copy.bodyPlaceholder} />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{copy.tagsLabel}</span>
                <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} className="community-input h-11 w-full rounded-2xl px-3 text-[14px]" placeholder={copy.tagsPlaceholder} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{copy.linkedLabel}</span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble-text-muted" aria-hidden="true" />
                  <input value={draft.linkedProblem} onChange={(event) => setDraft((current) => ({ ...current, linkedProblem: event.target.value }))} className="community-input h-11 w-full rounded-2xl pl-9 pr-3 text-[14px]" placeholder={copy.linkedPlaceholder} />
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{copy.groupLabel}</span>
              <select value={draft.groupId} onChange={(event) => setDraft((current) => ({ ...current, groupId: event.target.value }))} className="community-input h-11 w-full rounded-2xl px-3 text-[14px]">
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>

            <div className="community-inset rounded-[20px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-pebble-text-muted">{copy.prefillLabel}</p>
              <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.68] text-pebble-text-secondary">{copy.prefillBody}</p>
              <button type="button" onClick={() => setDraft({ title: 'Two Sum fails on duplicate case after Pebble hint', groupId: 'debugging-help', body: copy.prefillBody, tags: 'Array, Hash Map, Python', linkedProblem: 'Two Sum' })} className="mt-3 community-chip-accent inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]">
                {copy.prefillAction}
              </button>
            </div>

            <div className="community-inset rounded-[20px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-pebble-text-muted">{copy.postingNoteLabel}</p>
              <p className="mt-2 text-[12.5px] leading-[1.68] text-pebble-text-secondary">{copy.postingNoteBody}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[12px] text-pebble-text-muted">{canSubmit ? copy.ready : copy.needsMore}</p>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={onClose} className="rounded-2xl px-4">{copy.cancel}</Button>
            <Button
              onClick={() => {
                if (!canSubmit) return
                onSubmit({
                  title: draft.title.trim(),
                  groupId: draft.groupId,
                  body: draft.body.trim(),
                  tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
                  linkedProblem: draft.linkedProblem.trim() || undefined,
                })
              }}
              disabled={!canSubmit}
              className="gap-2 rounded-2xl px-4"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              {copy.post}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    portalHost,
  )
}

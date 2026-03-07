import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, MessageSquarePlus, Sparkles, UsersRound, Wrench } from 'lucide-react'
import { Button } from '../ui/Button'
import type { CommunityGroup } from '../../data/communitySeed'
import type { ComposerPrefill } from './communityTypes'

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

const QUICK_TYPES = [
  { id: 'debug', label: 'Ask for debugging help', icon: Wrench },
  { id: 'insight', label: 'Share insight', icon: Sparkles },
  { id: 'partners', label: 'Find project partners', icon: UsersRound },
] as const

function buildInitialDraft(prefill?: ComposerPrefill | null) {
  return {
    title: prefill?.title ?? '',
    groupId: prefill?.groupId ?? 'debugging-help',
    body: prefill?.body ?? '',
    tags: prefill?.tags?.join(', ') ?? '',
    linkedProblem: prefill?.linkedProblem ?? '',
  }
}

export function CommunityComposer({
  groups,
  open,
  prefill,
  onClose,
  onSubmit,
}: CommunityComposerProps) {
  const [draft, setDraft] = useState(() => buildInitialDraft(prefill))

  useEffect(() => {
    if (!open) {
      return
    }
    setDraft(buildInitialDraft(prefill))
  }, [open, prefill])

  useEffect(() => {
    if (!open) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const canSubmit = useMemo(
    () => draft.title.trim().length >= 8 && draft.body.trim().length >= 24,
    [draft.body, draft.title],
  )

  if (!open) {
    return null
  }

  const portalHost = document.getElementById('pebble-portal') ?? document.body

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/38 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="community-panel-float relative z-10 w-full max-w-[720px] rounded-[28px] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
              Ask community
            </p>
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-pebble-text-primary">
              Turn a stuck moment into a discussion.
            </h2>
            <p className="max-w-[48ch] text-[13.5px] leading-[1.7] text-pebble-text-secondary">
              Ask for debugging help, share an insight, or start a collaboration thread that connects Pebble sessions with real peer learning.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="community-chip-muted inline-flex h-10 w-10 items-center justify-center rounded-2xl"
            aria-label="Close composer"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {QUICK_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === 'debug') {
                  setDraft((current) => ({
                    ...current,
                    groupId: 'debugging-help',
                    title: current.title || 'Need help understanding a failed testcase in Pebble',
                  }))
                }
                if (id === 'insight') {
                  setDraft((current) => ({
                    ...current,
                    groupId: 'dsa-strategy',
                    title: current.title || 'Sharing one approach that finally clicked for me',
                  }))
                }
                if (id === 'partners') {
                  setDraft((current) => ({
                    ...current,
                    groupId: 'project-partners',
                    title: current.title || 'Looking for one teammate for a student build sprint',
                  }))
                }
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
                Title
              </span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="community-input h-11 w-full rounded-2xl px-3 text-[14px]"
                placeholder="What are you stuck on?"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
                Body
              </span>
              <textarea
                value={draft.body}
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                className="community-input min-h-[140px] w-full rounded-[22px] px-3 py-3 text-[14px] leading-[1.65]"
                placeholder="Share the failing case, the logic you tried, or the kind of review you want from peers."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
                  Tags
                </span>
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                  className="community-input h-11 w-full rounded-2xl px-3 text-[14px]"
                  placeholder="Array, Hash Map, Python"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
                  Linked problem
                </span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pebble-text-muted" aria-hidden="true" />
                  <input
                    value={draft.linkedProblem}
                    onChange={(event) => setDraft((current) => ({ ...current, linkedProblem: event.target.value }))}
                    className="community-input h-11 w-full rounded-2xl pl-9 pr-3 text-[14px]"
                    placeholder="Two Sum"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
                Group
              </span>
              <select
                value={draft.groupId}
                onChange={(event) => setDraft((current) => ({ ...current, groupId: event.target.value }))}
                className="community-input h-11 w-full rounded-2xl px-3 text-[14px]"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="community-inset rounded-[20px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-pebble-text-muted">
                Create from current problem
              </p>
              <p className="mt-2 text-[13px] leading-[1.68] text-pebble-text-secondary">
                Problem: Two Sum
                <br />
                Language: Python
                <br />
                Issue: Fails on test case #2
              </p>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    title: 'Two Sum fails on duplicate case after Pebble hint',
                    groupId: 'debugging-help',
                    body: 'I ran this in Pebble using Python. Test case #2 still fails after following the hint about complement order. Looking for a plain-language explanation of what I am missing and how you would debug it.',
                    tags: 'Array, Hash Map, Python',
                    linkedProblem: 'Two Sum',
                  })
                }
                className="mt-3 community-chip-accent inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
              >
                Prefill from session
              </button>
            </div>

            <div className="community-inset rounded-[20px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-pebble-text-muted">
                Posting note
              </p>
              <p className="mt-2 text-[12.5px] leading-[1.68] text-pebble-text-secondary">
                This prototype appends locally for demo purposes. It is structured to map cleanly to future community APIs.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[12px] text-pebble-text-muted">
            {canSubmit ? 'Ready to post into the seeded community feed.' : 'Add a clearer title and a little more context.'}
          </p>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={onClose} className="rounded-2xl px-4">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!canSubmit) return
                onSubmit({
                  title: draft.title.trim(),
                  groupId: draft.groupId,
                  body: draft.body.trim(),
                  tags: draft.tags.split(',').map((part) => part.trim()).filter(Boolean),
                  linkedProblem: draft.linkedProblem.trim() || undefined,
                })
              }}
              disabled={!canSubmit}
              className="gap-2 rounded-2xl px-4"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Post to community
            </Button>
          </div>
        </div>
      </div>
    </div>,
    portalHost,
  )
}

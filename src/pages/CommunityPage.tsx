import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpenText,
  ChartNoAxesCombined,
  Compass,
  MessageSquarePlus,
  MessagesSquare,
  Pin,
  Sparkles,
  Users,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import {
  COMMUNITY_FILTERS,
  COMMUNITY_GROUPS,
  COMMUNITY_HERO_STATS,
  COMMUNITY_POSTS,
  COMMUNITY_TOP_HELPERS,
  COMMUNITY_TRENDING_TOPICS,
  type CommunityFilterId,
  type CommunityPost,
} from '../data/communitySeed'
import { CommunityHero } from '../components/community/CommunityHero'
import { CommunityGroupCard } from '../components/community/CommunityGroupCard'
import { CommunityPostCard } from '../components/community/CommunityPostCard'
import { CommunityComposer } from '../components/community/CommunityComposer'
import type { ComposerPrefill } from '../components/community/communityTypes'

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function buildDemoPost(payload: {
  title: string
  groupId: string
  body: string
  tags: string[]
  linkedProblem?: string
}): CommunityPost {
  return {
    id: `draft-${Date.now()}`,
    groupId: payload.groupId,
    title: payload.title,
    author: 'You',
    initials: 'YO',
    timestamp: 'just now',
    body: payload.body,
    replyCount: 0,
    helpfulCount: 0,
    solved: false,
    tags: payload.tags,
    linkedProblem: payload.linkedProblem,
    previewReplies: [],
  }
}

export function CommunityPage() {
  const [activeFilter, setActiveFilter] = useState<CommunityFilterId>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string>(COMMUNITY_GROUPS[0]?.id ?? 'debugging-help')
  const [posts, setPosts] = useState<CommunityPost[]>(COMMUNITY_POSTS)
  const [selectedPostId, setSelectedPostId] = useState<string>(COMMUNITY_POSTS[0]?.id ?? '')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerPrefill, setComposerPrefill] = useState<ComposerPrefill | null>(null)
  const groupAnchorRef = useRef<HTMLDivElement | null>(null)

  const selectedGroup = useMemo(
    () => COMMUNITY_GROUPS.find((group) => group.id === selectedGroupId) ?? COMMUNITY_GROUPS[0],
    [selectedGroupId],
  )

  const filteredPosts = useMemo(() => {
    let next = posts

    if (selectedGroupId) {
      next = next.filter((post) => post.groupId === selectedGroupId)
    }

    if (activeFilter === 'unanswered') {
      next = next.filter((post) => !post.solved && post.replyCount <= 1)
    } else if (activeFilter === 'helpful') {
      next = [...next].sort((left, right) => right.helpfulCount - left.helpfulCount)
    } else if (activeFilter === 'trending') {
      next = next.filter((post) => post.trending)
    } else if (activeFilter === 'problem') {
      next = next.filter((post) => Boolean(post.linkedProblem))
    }

    return next
  }, [activeFilter, posts, selectedGroupId])

  const selectedPost = useMemo(
    () => filteredPosts.find((post) => post.id === selectedPostId) ?? filteredPosts[0] ?? posts[0] ?? null,
    [filteredPosts, posts, selectedPostId],
  )

  const selectedPostGroup = useMemo(
    () => COMMUNITY_GROUPS.find((group) => group.id === selectedPost?.groupId) ?? selectedGroup,
    [selectedGroup, selectedPost?.groupId],
  )

  const communityHealth = useMemo(
    () => ({
      solvedThreads: `${posts.filter((post) => post.solved).length}/${posts.length}`,
      averageReplies: (posts.reduce((sum, post) => sum + post.replyCount, 0) / posts.length).toFixed(1),
      responseWindow: '18m median first reply',
    }),
    [posts],
  )

  return (
    <section className="page-enter space-y-4 pb-4">
      <CommunityHero
        stats={COMMUNITY_HERO_STATS}
        onAskCommunity={() => {
          setComposerPrefill(null)
          setComposerOpen(true)
        }}
        onBrowseGroups={() => groupAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <div ref={groupAnchorRef}>
        <Card padding="sm" interactive className="community-band-shell rounded-[28px] px-4 py-4 md:px-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="community-section-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Featured groups
            </div>
            <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-pebble-text-primary">
              Find the right discussion space fast
            </h2>
            <p className="text-[13px] leading-[1.65] text-pebble-text-secondary">
              Seeded study spaces make the ecosystem feel alive and show how Pebble can grow beyond solo practice.
            </p>
          </div>
          <Badge className="community-chip-muted border-0">
            10 seeded groups
          </Badge>
        </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {COMMUNITY_GROUPS.map((group) => (
              <CommunityGroupCard
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onClick={() => {
                  setSelectedGroupId(group.id)
                  const nextPost = posts.find((post) => post.groupId === group.id)
                  if (nextPost) {
                    setSelectedPostId(nextPost.id)
                  }
                }}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        <Card padding="sm" interactive className="community-rail-shell rounded-[26px] px-4 py-4">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                Community view
              </p>
              <div className="mt-3 space-y-2">
                {COMMUNITY_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={classNames(
                      'community-rail-link',
                      activeFilter === filter.id && 'community-rail-link-active',
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="community-divider" />

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                Group shortcuts
              </p>
              <div className="mt-3 space-y-2">
                {COMMUNITY_GROUPS.slice(0, 6).map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={classNames(
                      'community-rail-link justify-between',
                      selectedGroupId === group.id && 'community-rail-link-active',
                    )}
                  >
                    <span>{group.name}</span>
                    <span className="text-[11px] text-pebble-text-muted">{group.lastActivity}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="community-inset-strong rounded-[22px] p-4">
              <div className="flex items-start gap-3">
                <span className="community-chip-accent inline-flex h-10 w-10 items-center justify-center rounded-2xl">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                    Ask from current problem
                  </p>
                  <p className="text-[13px] leading-[1.7] text-pebble-text-secondary">
                    Turn a failed run into a discussion post with the problem, language, and testcase context already filled in.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setComposerPrefill({
                    title: 'Two Sum fails on duplicate case after Pebble hint',
                    groupId: 'debugging-help',
                    body: 'Problem: Two Sum\nLanguage: Python\nIssue: Fails on test case #2 even after following Pebble’s hint. Looking for a plain-language explanation of the correct hashmap flow.',
                    tags: ['Array', 'Hash Map', 'Python'],
                    linkedProblem: 'Two Sum',
                  })
                  setComposerOpen(true)
                }}
                className="mt-4 w-full rounded-2xl"
              >
                Create from current problem
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="sm" interactive className="community-feed-shell rounded-[26px] px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <div className="community-section-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
                  <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  Discussion feed
                </div>
                <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-pebble-text-primary">
                  {selectedGroup?.name ?? 'Community feed'}
                </h2>
                <p className="text-[13px] leading-[1.65] text-pebble-text-secondary">
                  Ask peers when AI hints are not enough, or share the one explanation that finally made a concept click.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="community-chip-muted inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium">
                  {filteredPosts.length} visible threads
                </span>
                <Button
                  onClick={() => {
                    setComposerPrefill(null)
                    setComposerOpen(true)
                  }}
                  className="gap-2 rounded-2xl px-4"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  Ask community
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {filteredPosts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  groupName={COMMUNITY_GROUPS.find((group) => group.id === post.groupId)?.name ?? 'Community'}
                  selected={selectedPost?.id === post.id}
                  onSelect={() => setSelectedPostId(post.id)}
                />
              ))}
            </div>
          </Card>

          <Card padding="sm" interactive className="community-composer-strip rounded-[24px] px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                  Community composer
                </p>
                <p className="text-[13.5px] leading-[1.68] text-pebble-text-secondary">
                  Prototype the peer layer: ask for debugging help, share insight, or find collaborators without leaving Pebble.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setComposerPrefill({
                      title: 'Need help explaining a failing case',
                      groupId: 'debugging-help',
                    })
                    setComposerOpen(true)
                  }}
                  className="rounded-2xl px-4"
                >
                  Debugging help
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setComposerPrefill({
                      title: 'Looking for one teammate for a hackathon build',
                      groupId: 'project-partners',
                    })
                    setComposerOpen(true)
                  }}
                  className="rounded-2xl px-4"
                >
                  Project partners
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="sm" interactive className="community-preview-shell rounded-[26px] px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                  Live discussion preview
                </p>
                <h3 className="mt-1 text-[1rem] font-semibold tracking-[-0.02em] text-pebble-text-primary">
                  {selectedPost?.title ?? 'Select a thread'}
                </h3>
              </div>
              {selectedPost?.solved ? (
                <span className="community-chip-accent inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                  Solved
                </span>
              ) : null}
            </div>

            {selectedPost ? (
              <div className="space-y-4">
                <div className="community-inset rounded-[20px] p-4">
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-pebble-text-muted">
                    <span className="font-medium text-pebble-text-secondary">{selectedPost.author}</span>
                    <span>•</span>
                    <span>{selectedPost.timestamp}</span>
                    <span>•</span>
                    <span>{selectedPostGroup?.name}</span>
                  </div>
                  <p className="text-[13.5px] leading-[1.78] text-pebble-text-secondary">{selectedPost.body}</p>
                </div>

                <div className="space-y-2.5">
                  {selectedPost.previewReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className={classNames(
                        'community-reply-card rounded-[18px] px-3.5 py-3',
                        reply.helpful && 'community-reply-card-helpful',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="community-avatar community-avatar-sm">{reply.initials}</span>
                          <div>
                            <p className="text-[12.5px] font-semibold text-pebble-text-primary">{reply.author}</p>
                            <p className="text-[11px] text-pebble-text-muted">
                              {reply.role ?? 'Reply'} • {reply.timestamp}
                            </p>
                          </div>
                        </div>
                        {reply.helpful ? (
                          <span className="community-chip-accent inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
                            Marked helpful
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[12.5px] leading-[1.72] text-pebble-text-secondary">{reply.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-pebble-text-secondary">Pick a thread from the feed to preview the discussion.</p>
            )}
          </Card>

          <Card padding="sm" interactive className="community-rail-shell rounded-[24px] px-4 py-4">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                  Community health
                </p>
                <div className="mt-3 grid gap-2">
                  <div className="community-inset rounded-[18px] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-pebble-text-muted">Solved threads</p>
                    <p className="mt-1 text-[1rem] font-semibold text-pebble-text-primary">{communityHealth.solvedThreads}</p>
                  </div>
                  <div className="community-inset rounded-[18px] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-pebble-text-muted">Avg replies</p>
                    <p className="mt-1 text-[1rem] font-semibold text-pebble-text-primary">{communityHealth.averageReplies}</p>
                  </div>
                  <div className="community-inset rounded-[18px] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-pebble-text-muted">Response window</p>
                    <p className="mt-1 text-[1rem] font-semibold text-pebble-text-primary">{communityHealth.responseWindow}</p>
                  </div>
                </div>
              </div>

              <div className="community-divider" />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                  Trending topics
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COMMUNITY_TRENDING_TOPICS.map((topic) => (
                    <span key={topic} className="community-chip-muted inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="sm" interactive className="community-rail-shell rounded-[24px] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="community-chip-accent inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <Users className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">Top helpers this week</p>
              <p className="text-[13px] leading-[1.7] text-pebble-text-secondary">Seeded contributors showing the community is already useful and active.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {COMMUNITY_TOP_HELPERS.map((helper) => (
              <div key={helper.id} className="community-inset rounded-[18px] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="community-avatar community-avatar-sm">{helper.initials}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-pebble-text-primary">{helper.name}</p>
                      <p className="text-[11px] text-pebble-text-muted">{helper.specialty}</p>
                    </div>
                  </div>
                  <span className="text-[12px] font-medium text-pebble-text-secondary">{helper.helpfulCount} helpful</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="sm" interactive className="community-rail-shell rounded-[24px] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="community-chip-accent inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <ChartNoAxesCombined className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">Why this matters</p>
              <p className="text-[13px] leading-[1.7] text-pebble-text-secondary">The community layer turns Pebble from a solo coach into a peer-learning ecosystem.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              'Students can escalate from AI hints to human explanations.',
              'Failed runs can become shareable learning moments.',
              'Collaborator and mentor discovery becomes a natural next layer.',
            ].map((item) => (
              <div key={item} className="community-inset rounded-[18px] px-3 py-3 text-[13px] leading-[1.68] text-pebble-text-secondary">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card padding="sm" interactive className="community-rail-shell rounded-[24px] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="community-chip-accent inline-flex h-10 w-10 items-center justify-center rounded-2xl">
              <BookOpenText className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">Coming next</p>
              <p className="text-[13px] leading-[1.7] text-pebble-text-secondary">Future ecosystem signals judges can understand immediately.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="community-inset-strong rounded-[18px] px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-pebble-text-primary">Mentor drop-ins</p>
                  <p className="mt-1 text-[12.5px] leading-[1.68] text-pebble-text-secondary">Future mentor office hours for difficult community threads and interview prep discussions.</p>
                </div>
                <Pin className="mt-0.5 h-4 w-4 text-pebble-accent" aria-hidden="true" />
              </div>
            </div>
            <div className="community-inset rounded-[18px] px-3.5 py-3.5">
              <p className="text-[13px] font-semibold text-pebble-text-primary">Student-created problems</p>
              <p className="mt-1 text-[12.5px] leading-[1.68] text-pebble-text-secondary">Community-written questions, peer-reviewed solutions, and shared interview debriefs can grow naturally from this layer.</p>
            </div>
            <Link
              to="/problems"
              className="community-chip-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-pebble-text-primary"
            >
              Explore current problem bank
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </div>

      <CommunityComposer
        groups={COMMUNITY_GROUPS}
        open={composerOpen}
        prefill={composerPrefill}
        onClose={() => setComposerOpen(false)}
        onSubmit={(payload) => {
          const post = buildDemoPost(payload)
          setPosts((current) => [post, ...current])
          setSelectedGroupId(payload.groupId)
          setSelectedPostId(post.id)
          setComposerOpen(false)
        }}
      />
    </section>
  )
}

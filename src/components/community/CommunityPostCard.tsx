import { CheckCircle2, ChevronRight, Flame, MessageCircleMore, ThumbsUp } from 'lucide-react'
import type { CommunityPost } from '../../data/communitySeed'

type CommunityPostCardProps = {
  post: CommunityPost
  groupName: string
  selected?: boolean
  onSelect: () => void
}

export function CommunityPostCard({ post, groupName, selected = false, onSelect }: CommunityPostCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`community-post-card text-left ${selected ? 'community-post-card-active' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="community-chip-accent inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
              {groupName}
            </span>
            {post.linkedProblem ? (
              <span className="community-chip-muted inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium">
                {post.linkedProblem}
              </span>
            ) : null}
            {post.trending ? (
              <span className="community-chip-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-pebble-accent">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Trending
              </span>
            ) : null}
          </div>
          <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-pebble-text-primary">{post.title}</h3>
        </div>

        <span className={`community-avatar ${selected ? 'community-avatar-active' : ''}`}>{post.initials}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-pebble-text-muted">
        <span className="font-medium text-pebble-text-secondary">{post.author}</span>
        <span>•</span>
        <span>{post.timestamp}</span>
        {post.solved ? (
          <>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Solved
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-3 text-[13.5px] leading-[1.72] text-pebble-text-secondary">
        {post.body}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {post.tags.map((tag) => (
          <span key={tag} className="community-chip-muted inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-pebble-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <MessageCircleMore className="h-3.5 w-3.5" aria-hidden="true" />
            {post.replyCount} replies
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
            {post.helpfulCount} helpful
          </span>
        </div>

        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-pebble-text-primary">
          Open thread
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </button>
  )
}

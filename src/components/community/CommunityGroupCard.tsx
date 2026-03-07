import {
  Bug,
  Code2,
  Database,
  BriefcaseBusiness,
  Users,
  Rocket,
  Palette,
  Blocks,
  FileText,
  Sparkles,
} from 'lucide-react'
import type { CommunityGroup } from '../../data/communitySeed'

const iconMap = {
  bug: Bug,
  code: Code2,
  database: Database,
  briefcase: BriefcaseBusiness,
  users: Users,
  rocket: Rocket,
  palette: Palette,
  blocks: Blocks,
  file: FileText,
  sparkles: Sparkles,
} as const

type CommunityGroupCardProps = {
  group: CommunityGroup
  selected?: boolean
  onClick: () => void
}

export function CommunityGroupCard({ group, selected = false, onClick }: CommunityGroupCardProps) {
  const Icon = iconMap[group.icon]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`community-group-card text-left ${selected ? 'community-group-card-active' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`community-group-icon ${selected ? 'community-group-icon-active' : ''}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {group.featured ? (
          <span className="community-chip-accent inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
            Featured
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-1.5">
        <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-pebble-text-primary">{group.name}</h3>
        <p className="text-[12.5px] leading-[1.65] text-pebble-text-secondary">{group.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-[11px] font-medium text-pebble-text-muted">
        <span>{group.membersLabel}</span>
        <span>{group.lastActivity}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {group.tags.map((tag) => (
          <span key={tag} className="community-chip-muted inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium">
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

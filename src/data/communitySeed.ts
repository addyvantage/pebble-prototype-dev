export type CommunityGroup = {
  id: string
  name: string
  description: string
  icon: 'bug' | 'code' | 'database' | 'briefcase' | 'users' | 'rocket' | 'palette' | 'blocks' | 'file' | 'sparkles'
  membersLabel: string
  lastActivity: string
  tags: string[]
  featured?: boolean
}

export type CommunityReply = {
  id: string
  author: string
  role?: string
  initials: string
  body: string
  helpful?: boolean
  timestamp: string
}

export type CommunityPost = {
  id: string
  groupId: string
  title: string
  author: string
  initials: string
  timestamp: string
  body: string
  replyCount: number
  helpfulCount: number
  solved: boolean
  trending?: boolean
  tags: string[]
  linkedProblem?: string
  previewReplies: CommunityReply[]
}

export type CommunityStat = {
  label: string
  value: string
  detail: string
}

export type CommunityContributor = {
  id: string
  name: string
  initials: string
  specialty: string
  helpfulCount: number
}

export const COMMUNITY_GROUPS: CommunityGroup[] = [
  {
    id: 'debugging-help',
    name: 'Debugging Help',
    description: 'Turn failed runs into clear next steps with peer debugging eyes.',
    icon: 'bug',
    membersLabel: '2.4k learners',
    lastActivity: 'Active 8m ago',
    tags: ['Fail cases', 'Edge cases', 'Runtime'],
    featured: true,
  },
  {
    id: 'python-help',
    name: 'Python Help',
    description: 'Python syntax, patterns, interview-style code review, and cleanup.',
    icon: 'code',
    membersLabel: '1.9k learners',
    lastActivity: 'Active 14m ago',
    tags: ['Python', 'Hash Map', 'Loops'],
  },
  {
    id: 'sql-help',
    name: 'SQL Help',
    description: 'Queries, joins, subqueries, and interview-style database thinking.',
    icon: 'database',
    membersLabel: '1.3k learners',
    lastActivity: 'Active 21m ago',
    tags: ['JOIN', 'CTE', 'Practice'],
  },
  {
    id: 'interview-prep',
    name: 'Interview Prep',
    description: 'Mock prompts, explanation drills, and placement strategy threads.',
    icon: 'briefcase',
    membersLabel: '3.1k learners',
    lastActivity: 'Active 6m ago',
    tags: ['Placements', 'Complexity', 'Mocks'],
  },
  {
    id: 'project-partners',
    name: 'Project Partners',
    description: 'Find teammates for student builds, demos, and hackathon sprint work.',
    icon: 'users',
    membersLabel: '860 builders',
    lastActivity: 'Active 39m ago',
    tags: ['Hackathon', 'Collab', 'MVP'],
  },
  {
    id: 'hackathon-ideas',
    name: 'Hackathon Ideas',
    description: 'Pitch shaping, API ideas, and fast feedback on build direction.',
    icon: 'rocket',
    membersLabel: '1.1k builders',
    lastActivity: 'Active 52m ago',
    tags: ['Pitch', 'Build scope', 'AI'],
  },
  {
    id: 'frontend-ui-critique',
    name: 'Frontend UI Critique',
    description: 'Interface reviews, polish feedback, and demo-readiness opinions.',
    icon: 'palette',
    membersLabel: '640 designers',
    lastActivity: 'Active 1h ago',
    tags: ['UI', 'React', 'Polish'],
  },
  {
    id: 'dsa-strategy',
    name: 'DSA Strategy',
    description: 'Pattern selection, sequencing, and how to recover after a wrong turn.',
    icon: 'blocks',
    membersLabel: '2.8k learners',
    lastActivity: 'Active 11m ago',
    tags: ['Arrays', 'DP', 'Graph'],
  },
  {
    id: 'resume-reviews',
    name: 'Resume Reviews',
    description: 'Peer critique for internships, projects, and placement-ready resumes.',
    icon: 'file',
    membersLabel: '720 learners',
    lastActivity: 'Active yesterday',
    tags: ['Resume', 'Projects', 'Placements'],
  },
  {
    id: 'ai-prompting',
    name: 'AI Prompting for Coders',
    description: 'How to ask better questions when AI hints are not enough on their own.',
    icon: 'sparkles',
    membersLabel: '930 learners',
    lastActivity: 'Active 2h ago',
    tags: ['Prompting', 'AI hints', 'Workflow'],
  },
]

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-two-sum-duplicates',
    groupId: 'debugging-help',
    title: 'Why does my Two Sum fail when the same value appears twice?',
    author: 'Aarav',
    initials: 'AA',
    timestamp: '15m ago',
    body: 'Pebble flagged test case #2 and hinted at complement order, but I still keep missing the duplicate case. I check after inserting into the map. Can someone explain why that fails on duplicate values?',
    replyCount: 14,
    helpfulCount: 23,
    solved: true,
    trending: true,
    tags: ['Array', 'Hash Map', 'Python'],
    linkedProblem: 'Two Sum',
    previewReplies: [
      {
        id: 'reply-two-sum-1',
        author: 'Meera',
        initials: 'ME',
        role: 'Helpful reply',
        body: 'If you insert first, the current element can match itself. Check whether `target - current` already exists before storing the current value.',
        helpful: true,
        timestamp: '11m ago',
      },
      {
        id: 'reply-two-sum-2',
        author: 'Rohan',
        initials: 'RO',
        body: 'Think of the map as memory of previous numbers only. The current index should never be available to itself.',
        timestamp: '9m ago',
      },
      {
        id: 'reply-two-sum-3',
        author: 'Sneha',
        initials: 'SN',
        body: 'Pebble’s hint is basically nudging you toward “search first, store second.” Once I reframed it that way the duplicates case made sense.',
        timestamp: '7m ago',
      },
    ],
  },
  {
    id: 'post-sql-join',
    groupId: 'sql-help',
    title: 'How do you explain LEFT JOIN vs INNER JOIN in a real interview answer?',
    author: 'Kavya',
    initials: 'KA',
    timestamp: '28m ago',
    body: 'I can write the query, but my explanation sounds mechanical. Looking for a sharper way to explain business impact and missing rows without rambling.',
    replyCount: 9,
    helpfulCount: 17,
    solved: false,
    tags: ['SQL', 'JOIN', 'Interview'],
    linkedProblem: 'Customer Orders Join',
    previewReplies: [
      {
        id: 'reply-sql-1',
        author: 'Isha',
        initials: 'IS',
        body: 'Anchor your answer around missing matches. INNER JOIN keeps overlap only; LEFT JOIN preserves the left table even when no match exists.',
        helpful: true,
        timestamp: '19m ago',
      },
      {
        id: 'reply-sql-2',
        author: 'Rahul',
        initials: 'RA',
        body: 'Use a simple business frame: “show every customer, even if they never ordered.” That usually lands well in interviews.',
        timestamp: '17m ago',
      },
    ],
  },
  {
    id: 'post-recursion-review',
    groupId: 'interview-prep',
    title: 'Can someone review how I explain recursion without sounding lost?',
    author: 'Aditya',
    initials: 'AD',
    timestamp: '43m ago',
    body: 'I understand the base case and recursive step, but in mock interviews my explanation gets messy. Looking for a concise way to explain it with confidence.',
    replyCount: 11,
    helpfulCount: 15,
    solved: false,
    tags: ['Recursion', 'Interview', 'Communication'],
    previewReplies: [
      {
        id: 'reply-rec-1',
        author: 'Tanvi',
        initials: 'TA',
        body: 'Try a 3-part pattern: what shrinks, where it stops, and what each call returns back up.',
        helpful: true,
        timestamp: '33m ago',
      },
      {
        id: 'reply-rec-2',
        author: 'Priyanshu',
        initials: 'PR',
        body: 'Don’t start with the call stack. Start with the repeated subproblem and then mention the stack only if asked.',
        timestamp: '29m ago',
      },
    ],
  },
  {
    id: 'post-hackathon-teammate',
    groupId: 'project-partners',
    title: 'Need one frontend teammate for an AI hackathon build this weekend',
    author: 'Dev',
    initials: 'DE',
    timestamp: '1h ago',
    body: 'We have backend and product handled. Looking for someone comfortable with React + Tailwind to polish a student-facing demo quickly.',
    replyCount: 6,
    helpfulCount: 8,
    solved: false,
    tags: ['Hackathon', 'React', 'Frontend'],
    previewReplies: [
      {
        id: 'reply-team-1',
        author: 'Harsh',
        initials: 'HA',
        body: 'What timezone and scope? I can help if the front-end work is mostly polish and demo prep.',
        timestamp: '52m ago',
      },
      {
        id: 'reply-team-2',
        author: 'Kavya',
        initials: 'KA',
        body: 'If you still need help on Sunday, I can jump in for UX review and screen polish.',
        helpful: true,
        timestamp: '49m ago',
      },
    ],
  },
  {
    id: 'post-pebble-hint',
    groupId: 'ai-prompting',
    title: 'Pebble gave me a hint, but I still don’t get the hashmap logic',
    author: 'Meera',
    initials: 'ME',
    timestamp: '1h ago',
    body: 'The hint says to “track what the current element needs,” which sounds smart but I’m still fuzzy. How do you translate AI hints into something you can actually code?',
    replyCount: 18,
    helpfulCount: 31,
    solved: true,
    trending: true,
    tags: ['AI hints', 'Hash Map', 'Workflow'],
    previewReplies: [
      {
        id: 'reply-hint-1',
        author: 'Aarav',
        initials: 'AA',
        role: 'Helpful reply',
        body: 'Rewrite the hint in plain words before coding. For hashmap questions I literally ask: “what would I want to have seen already?”',
        helpful: true,
        timestamp: '54m ago',
      },
      {
        id: 'reply-hint-2',
        author: 'Sneha',
        initials: 'SN',
        body: 'Pebble is strongest when you pair it with one self-explanation step. Ask it to restate the hint against your failing testcase.',
        timestamp: '41m ago',
      },
    ],
  },
  {
    id: 'post-time-complexity',
    groupId: 'interview-prep',
    title: 'Best way to explain time complexity without sounding memorized?',
    author: 'Rahul',
    initials: 'RA',
    timestamp: '2h ago',
    body: 'I know the big-O answers, but I want a better way to justify them from the loops and operations I actually wrote.',
    replyCount: 7,
    helpfulCount: 13,
    solved: false,
    tags: ['Interview', 'Complexity', 'Explanation'],
    previewReplies: [
      {
        id: 'reply-complexity-1',
        author: 'Isha',
        initials: 'IS',
        body: 'Narrate the source of work: one pass, nested pass, hash lookup, sort. That sounds more grounded than reciting O(n log n).',
        helpful: true,
        timestamp: '1h ago',
      },
      {
        id: 'reply-complexity-2',
        author: 'Tanvi',
        initials: 'TA',
        body: 'Interviewers usually trust reasoning from the code more than a fast answer from memory.',
        timestamp: '56m ago',
      },
    ],
  },
  {
    id: 'post-python-to-sql',
    groupId: 'sql-help',
    title: 'How should I start SQL if I already know Python?',
    author: 'Isha',
    initials: 'IS',
    timestamp: '3h ago',
    body: 'I’m comfortable with Python logic but SQL feels like a different mental model. Looking for the most useful entry path for placements.',
    replyCount: 10,
    helpfulCount: 19,
    solved: true,
    tags: ['SQL', 'Placements', 'Beginner'],
    previewReplies: [
      {
        id: 'reply-sql-path-1',
        author: 'Dev',
        initials: 'DE',
        body: 'Think in tables instead of loops. Start with select/filter/grouping, then joins once that feels natural.',
        helpful: true,
        timestamp: '2h ago',
      },
      {
        id: 'reply-sql-path-2',
        author: 'Kavya',
        initials: 'KA',
        body: 'Use interview-style datasets early. It helps the syntax feel connected to actual questions.',
        timestamp: '2h ago',
      },
    ],
  },
  {
    id: 'post-placements-dsa-sql',
    groupId: 'dsa-strategy',
    title: 'Anyone preparing for placements with DSA + SQL together?',
    author: 'Priyanshu',
    initials: 'PR',
    timestamp: '4h ago',
    body: 'I can stay consistent with one track, but balancing DSA and SQL in the same week has been messy. Curious how others sequence them.',
    replyCount: 12,
    helpfulCount: 16,
    solved: false,
    tags: ['Placements', 'DSA', 'SQL'],
    previewReplies: [
      {
        id: 'reply-sequence-1',
        author: 'Aditya',
        initials: 'AD',
        body: 'I use SQL on lower-energy days and DSA on focused blocks. That keeps both moving without mental overload.',
        helpful: true,
        timestamp: '3h ago',
      },
      {
        id: 'reply-sequence-2',
        author: 'Meera',
        initials: 'ME',
        body: 'Pebble’s daily plan format would actually be great for this: one SQL rep, one DSA rep, one review task.',
        timestamp: '3h ago',
      },
    ],
  },
  {
    id: 'post-session-recovery',
    groupId: 'debugging-help',
    title: 'After three failed runs I stop thinking clearly. How do you reset?',
    author: 'Sneha',
    initials: 'SN',
    timestamp: 'Yesterday',
    body: 'I like the Pebble recovery loop, but after a few wrong answers I still spiral and start patching randomly. Looking for human strategies that work.',
    replyCount: 16,
    helpfulCount: 29,
    solved: true,
    trending: true,
    tags: ['Recovery', 'Mindset', 'Debugging'],
    previewReplies: [
      {
        id: 'reply-recovery-1',
        author: 'Rahul',
        initials: 'RA',
        role: 'Helpful reply',
        body: 'I force a two-minute reset: write the failing case in words, state the invariant, then rerun only one change. It stops thrash.',
        helpful: true,
        timestamp: 'Yesterday',
      },
      {
        id: 'reply-recovery-2',
        author: 'Harsh',
        initials: 'HA',
        body: 'The worst move is stacking changes. I ask Pebble for a single next check, then I explain the case to myself before touching code.',
        timestamp: 'Yesterday',
      },
    ],
  },
  {
    id: 'post-ui-critique',
    groupId: 'frontend-ui-critique',
    title: 'Can someone critique the UI of my coding dashboard before demo day?',
    author: 'Tanvi',
    initials: 'TA',
    timestamp: 'Yesterday',
    body: 'The flow works, but it still looks like a student prototype. Looking for blunt feedback on hierarchy, spacing, and what judges notice first.',
    replyCount: 8,
    helpfulCount: 21,
    solved: false,
    tags: ['UI', 'Demo', 'Frontend'],
    previewReplies: [
      {
        id: 'reply-ui-1',
        author: 'Dev',
        initials: 'DE',
        body: 'Show the core story in one glance. Judges care more about what the product does than extra decorative components.',
        helpful: true,
        timestamp: 'Yesterday',
      },
      {
        id: 'reply-ui-2',
        author: 'Kavya',
        initials: 'KA',
        body: 'Reduce border noise first. That usually makes the whole page feel more premium immediately.',
        timestamp: 'Yesterday',
      },
    ],
  },
  {
    id: 'post-resume-review',
    groupId: 'resume-reviews',
    title: 'Could someone review the project bullets on my placement resume?',
    author: 'Harsh',
    initials: 'HA',
    timestamp: '2d ago',
    body: 'I have the right projects, but the bullets still sound generic. I want them to feel more outcome-driven without overselling.',
    replyCount: 5,
    helpfulCount: 9,
    solved: false,
    tags: ['Resume', 'Placements', 'Writing'],
    previewReplies: [
      {
        id: 'reply-resume-1',
        author: 'Isha',
        initials: 'IS',
        body: 'Lead with user or system outcome, then mention stack. Recruiters scan impact first.',
        helpful: true,
        timestamp: '2d ago',
      },
      {
        id: 'reply-resume-2',
        author: 'Meera',
        initials: 'ME',
        body: 'If you can demo it, write the bullet so someone can picture the product immediately.',
        timestamp: '2d ago',
      },
    ],
  },
  {
    id: 'post-hackathon-scope',
    groupId: 'hackathon-ideas',
    title: 'How do you decide what to cut from a hackathon MVP without weakening the story?',
    author: 'Rohan',
    initials: 'RO',
    timestamp: '2d ago',
    body: 'We keep adding features, but the pitch is getting blurry. Curious how others choose what stays in the demo and what becomes future scope.',
    replyCount: 13,
    helpfulCount: 24,
    solved: true,
    tags: ['Hackathon', 'MVP', 'Product'],
    previewReplies: [
      {
        id: 'reply-mvp-1',
        author: 'Aditya',
        initials: 'AD',
        body: 'Keep only what proves the thesis. Everything else becomes future ecosystem potential in the demo narrative.',
        helpful: true,
        timestamp: '2d ago',
      },
      {
        id: 'reply-mvp-2',
        author: 'Sneha',
        initials: 'SN',
        body: 'If a feature needs too much explanation, it probably isn’t MVP. Judges reward clarity more than breadth.',
        timestamp: '2d ago',
      },
    ],
  },
  {
    id: 'post-java-dsa',
    groupId: 'python-help',
    title: 'Is it okay to prepare DSA in Java if my strongest language is Python?',
    author: 'Kavya',
    initials: 'KA',
    timestamp: '3d ago',
    body: 'Some companies I’m targeting lean Java, but my thinking speed is still better in Python. Trying to decide whether switching now is worth it.',
    replyCount: 7,
    helpfulCount: 11,
    solved: false,
    tags: ['Java', 'Python', 'Placements'],
    previewReplies: [
      {
        id: 'reply-java-1',
        author: 'Rahul',
        initials: 'RA',
        body: 'Solve in Python to learn patterns fast, then translate selected problems into Java for interview readiness.',
        helpful: true,
        timestamp: '3d ago',
      },
      {
        id: 'reply-java-2',
        author: 'Dev',
        initials: 'DE',
        body: 'Don’t slow down your learning engine too early. Language translation is easier once the problem pattern is stable.',
        timestamp: '3d ago',
      },
    ],
  },
]

export const COMMUNITY_HERO_STATS: CommunityStat[] = [
  { label: 'Groups', value: '12', detail: 'seeded study spaces' },
  { label: 'Posts this week', value: '84', detail: 'demo activity' },
  { label: 'Replies', value: '1.2k', detail: 'peer response volume' },
  { label: 'Marked helpful', value: '73%', detail: 'resolved discussions' },
]

export const COMMUNITY_TRENDING_TOPICS = [
  'Hash Map recovery',
  'LEFT JOIN vs INNER JOIN',
  'Hackathon teammate search',
  'Recursion explanations',
  'Placement resume bullets',
]

export const COMMUNITY_TOP_HELPERS: CommunityContributor[] = [
  { id: 'helper-meera', name: 'Meera', initials: 'ME', specialty: 'Debugging clarity', helpfulCount: 38 },
  { id: 'helper-rahul', name: 'Rahul', initials: 'RA', specialty: 'Interview framing', helpfulCount: 32 },
  { id: 'helper-isha', name: 'Isha', initials: 'IS', specialty: 'SQL and placement prep', helpfulCount: 29 },
]

export const COMMUNITY_FILTERS = [
  { id: 'all', label: 'All discussions' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'helpful', label: 'Most helpful' },
  { id: 'trending', label: 'Trending' },
  { id: 'problem', label: 'Problem discussions' },
] as const

export type CommunityFilterId = (typeof COMMUNITY_FILTERS)[number]['id']

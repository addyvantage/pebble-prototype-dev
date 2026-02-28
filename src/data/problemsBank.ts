import type { PlacementLanguage } from './onboardingData'

export type ProblemLanguage = Extract<PlacementLanguage, 'python' | 'javascript' | 'cpp' | 'java'> | 'sql'
export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard'

export type ProblemTopicCount = {
  topic: string
  count: number
}

export type ProblemExample = {
  input: string
  output: string
  explanation?: string
}

export type ProblemTestCase = {
  input: string
  expected: string
}

export type SqlTableSchema = {
  name: string
  columns: Array<{ name: string; type: string }>
  rows: string[][]
}

export type SqlPreviewTable = {
  columns: string[]
  rows: string[][]
}

export type SqlProblemMeta = {
  tables: SqlTableSchema[]
  expectedResult: SqlPreviewTable
  checkerId: 'combine_two_tables' | 'second_highest_salary' | 'department_top_three'
}

export type ProblemDefinition = {
  id: string
  slug: string
  title: string
  difficulty: ProblemDifficulty
  topics: string[]
  languageSupport: ProblemLanguage[]
  acceptanceRate: number
  estimatedMinutes: number
  keySkills: string[]
  statement: {
    summary: string
    description: string
    input: string
    output: string
    constraints: string[]
    examples: ProblemExample[]
  }
  starterByLanguage: Partial<Record<ProblemLanguage, string>>
  tests: ProblemTestCase[]
  kind: 'code' | 'sql'
  sqlMeta?: SqlProblemMeta
  premium?: boolean
  createdAtRank: number
}

const CODE_LANGUAGE_SUPPORT: ProblemLanguage[] = ['python', 'javascript', 'java', 'cpp']

const GENERIC_STARTERS: Record<Exclude<ProblemLanguage, 'sql'>, string> = {
  python: `def solve():\n    # TODO: implement\n    pass\n\nif __name__ == "__main__":\n    solve()\n`,
  javascript: `function solve(input) {\n  // TODO: implement\n  return \"\";\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\nprocess.stdout.write(String(solve(input)));\n`,
  java: `import java.io.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    // TODO: implement\n  }\n}\n`,
  cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nint main() {\n  // TODO: implement\n  return 0;\n}\n`,
}

const SQL_STARTER = `-- Write your SQL query below\nSELECT p.firstName, p.lastName, a.city, a.state\nFROM Person p\nLEFT JOIN Address a ON p.personId = a.personId;\n`

const TOPICS_CATALOG: ProblemTopicCount[] = [
  { topic: 'Array', count: 23 },
  { topic: 'String', count: 32 },
  { topic: 'Hash Table', count: 29 },
  { topic: 'Math', count: 15 },
  { topic: 'Dynamic Programming', count: 18 },
  { topic: 'Sorting', count: 11 },
  { topic: 'Greedy', count: 9 },
  { topic: 'Graph', count: 10 },
  { topic: 'Tree', count: 9 },
  { topic: 'DFS', count: 7 },
  { topic: 'BFS', count: 6 },
  { topic: 'Two Pointers', count: 12 },
  { topic: 'Binary Search', count: 14 },
  { topic: 'Heap', count: 8 },
  { topic: 'Prefix Sum', count: 10 },
  { topic: 'Stack', count: 8 },
  { topic: 'Queue', count: 5 },
  { topic: 'Bit Manipulation', count: 7 },
  { topic: 'Union-Find', count: 4 },
  { topic: 'Trie', count: 3 },
  { topic: 'Segment Tree', count: 2 },
  { topic: 'Sliding Window', count: 12 },
  { topic: 'SQL', count: 16 },
  { topic: 'Backtracking', count: 5 },
  { topic: 'Monotonic Stack', count: 4 },
  { topic: 'Eulerian Circuit', count: 1 },
  { topic: 'Radix Sort', count: 3 },
  { topic: 'Suffix Array', count: 1 },
]

const CURATED_PROBLEMS: ProblemDefinition[] = [
  {
    id: 'p-two-sum',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    languageSupport: CODE_LANGUAGE_SUPPORT,
    acceptanceRate: 52,
    estimatedMinutes: 12,
    keySkills: ['index map', 'single pass'],
    statement: {
      summary: 'Find two indices whose values add up to target.',
      description: 'Given an integer array nums and an integer target, return the indices of the two numbers such that they add up to target. Assume exactly one valid answer exists.',
      input: 'An integer array nums and an integer target.',
      output: 'Two indices in ascending order separated by a space.',
      constraints: ['2 <= nums.length <= 10^5', '-10^9 <= nums[i], target <= 10^9'],
      examples: [{ input: '4\n2 7 11 15\n9', output: '0 1' }],
    },
    starterByLanguage: {
      python: `def solve():\n    import sys\n    data = sys.stdin.read().strip().split()\n    n = int(data[0])\n    nums = list(map(int, data[1:1+n]))\n    target = int(data[1+n])\n    # TODO\n    print(-1, -1)\n\nif __name__ == "__main__":\n    solve()\n`,
      javascript: `function solve(input) {\n  const data = input.trim().split(/\\s+/).map(Number);\n  const n = data[0];\n  const nums = data.slice(1, 1 + n);\n  const target = data[1 + n];\n  // TODO\n  return '-1 -1';\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\nprocess.stdout.write(String(solve(input)));\n`,
      java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    List<Integer> vals = new ArrayList<>();\n    for (String s : br.readLine().trim().split("\\\\s+")) vals.add(Integer.parseInt(s));\n    // TODO\n    System.out.println("-1 -1");\n  }\n}\n`,
      cpp: `#include <iostream>\n#include <vector>\n\nint main() {\n  // TODO\n  std::cout << "-1 -1";\n  return 0;\n}\n`,
    },
    tests: [
      { input: '4\n2 7 11 15\n9\n', expected: '0 1' },
      { input: '3\n3 2 4\n6\n', expected: '1 2' },
    ],
    kind: 'code',
    createdAtRank: 1,
  },
  {
    id: 'p-valid-anagram',
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    topics: ['String', 'Hash Table', 'Sorting'],
    languageSupport: CODE_LANGUAGE_SUPPORT,
    acceptanceRate: 61,
    estimatedMinutes: 10,
    keySkills: ['frequency map'],
    statement: {
      summary: 'Decide whether two strings are anagrams.',
      description: 'Given two strings s and t, return true if t is an anagram of s, and false otherwise.',
      input: 'Two lowercase strings, each on a new line.',
      output: 'Print true or false in lowercase.',
      constraints: ['1 <= s.length, t.length <= 5 * 10^4'],
      examples: [{ input: 'anagram\nnagaram', output: 'true' }],
    },
    starterByLanguage: { ...GENERIC_STARTERS },
    tests: [
      { input: 'anagram\nnagaram\n', expected: 'true' },
      { input: 'rat\ncar\n', expected: 'false' },
    ],
    kind: 'code',
    createdAtRank: 2,
  },
  {
    id: 'sql-combine-two-tables',
    slug: 'combine-two-tables',
    title: 'Combine Two Tables',
    difficulty: 'Easy',
    topics: ['SQL', 'Join'],
    languageSupport: ['sql'],
    acceptanceRate: 74,
    estimatedMinutes: 8,
    keySkills: ['left join', 'column selection'],
    statement: {
      summary: 'Report first name, last name, city, and state for each person.',
      description: 'Write a SQL query that reports firstName, lastName, city, and state for every person in the Person table. If there is no matching row in Address, return null for city and state.',
      input: 'Person and Address tables as shown below.',
      output: 'A table with columns firstName, lastName, city, state.',
      constraints: ['Do not remove people without address rows.', 'Order is not important.'],
      examples: [
        {
          input: 'Person + Address tables',
          output: 'firstName lastName city state',
          explanation: 'Use LEFT JOIN on personId.',
        },
      ],
    },
    starterByLanguage: {
      sql: SQL_STARTER,
    },
    tests: [{ input: 'schema', expected: 'Allen Wang Null Null\nBob Alice New York City New York' }],
    kind: 'sql',
    sqlMeta: {
      checkerId: 'combine_two_tables',
      tables: [
        {
          name: 'Person',
          columns: [
            { name: 'personId', type: 'int' },
            { name: 'lastName', type: 'varchar' },
            { name: 'firstName', type: 'varchar' },
          ],
          rows: [
            ['1', 'Wang', 'Allen'],
            ['2', 'Alice', 'Bob'],
          ],
        },
        {
          name: 'Address',
          columns: [
            { name: 'addressId', type: 'int' },
            { name: 'personId', type: 'int' },
            { name: 'city', type: 'varchar' },
            { name: 'state', type: 'varchar' },
          ],
          rows: [
            ['1', '2', 'New York City', 'New York'],
          ],
        },
      ],
      expectedResult: {
        columns: ['firstName', 'lastName', 'city', 'state'],
        rows: [
          ['Allen', 'Wang', 'null', 'null'],
          ['Bob', 'Alice', 'New York City', 'New York'],
        ],
      },
    },
    createdAtRank: 3,
  },
  {
    id: 'sql-second-highest-salary',
    slug: 'second-highest-salary',
    title: 'Second Highest Salary',
    difficulty: 'Medium',
    topics: ['SQL', 'Subquery'],
    languageSupport: ['sql'],
    acceptanceRate: 48,
    estimatedMinutes: 12,
    keySkills: ['distinct', 'limit/offset'],
    statement: {
      summary: 'Get the second highest distinct salary.',
      description: 'Write a SQL query to get the second highest distinct salary from the Employee table. If it does not exist, return null.',
      input: 'Employee(id, salary)',
      output: 'A one-row table with column SecondHighestSalary.',
      constraints: ['Use distinct salary values.', 'Return null when no second value exists.'],
      examples: [{ input: 'Employee', output: 'SecondHighestSalary' }],
    },
    starterByLanguage: {
      sql: `-- Write your SQL query below\nSELECT NULL AS SecondHighestSalary;\n`,
    },
    tests: [{ input: 'schema', expected: '200' }],
    kind: 'sql',
    sqlMeta: {
      checkerId: 'second_highest_salary',
      tables: [
        {
          name: 'Employee',
          columns: [
            { name: 'id', type: 'int' },
            { name: 'salary', type: 'int' },
          ],
          rows: [
            ['1', '100'],
            ['2', '200'],
            ['3', '300'],
          ],
        },
      ],
      expectedResult: {
        columns: ['SecondHighestSalary'],
        rows: [['200']],
      },
    },
    createdAtRank: 4,
  },
]

const TOPIC_SKILLS: Record<string, string[]> = {
  Array: ['index reasoning', 'boundary handling'],
  String: ['character transforms', 'state tracking'],
  'Hash Table': ['fast lookup', 'collision-safe logic'],
  Math: ['formula simplification', 'number properties'],
  'Dynamic Programming': ['state transitions', 'memoization'],
  Sorting: ['ordering', 'custom comparator'],
  Greedy: ['local choice proof', 'invariants'],
  Graph: ['adjacency modeling', 'traversal'],
  Tree: ['recursive structure', 'dfs order'],
  DFS: ['recursion stack', 'visited state'],
  BFS: ['queue layering', 'shortest steps'],
  'Two Pointers': ['window movement', 'pair scan'],
  'Binary Search': ['monotonic predicate', 'mid updates'],
  Heap: ['priority ordering', 'top-k'],
  'Prefix Sum': ['range aggregate', 'running totals'],
  Stack: ['LIFO constraints', 'state unwind'],
  Queue: ['FIFO simulation', 'window progression'],
  'Bit Manipulation': ['bit masks', 'xor tricks'],
  'Sliding Window': ['window invariants', 'frequency tracking'],
  Backtracking: ['choice pruning', 'state rollback'],
}

const TOPICS_FOR_GENERATION = TOPICS_CATALOG.filter((entry) => entry.topic !== 'SQL').map((entry) => entry.topic)

const VERBS = [
  'Balance',
  'Optimize',
  'Count',
  'Track',
  'Merge',
  'Select',
  'Shift',
  'Align',
  'Rebuild',
  'Compress',
]

const NOUNS = [
  'Window Pairs',
  'Prefix Signals',
  'Unique Blocks',
  'Sorted Buckets',
  'Path Layers',
  'Peak Values',
  'Jump States',
  'Token Runs',
  'Range Groups',
  'Score Bands',
]

function buildGeneratedProblem(index: number): ProblemDefinition {
  const topic = TOPICS_FOR_GENERATION[index % TOPICS_FOR_GENERATION.length]
  const secondaryTopic = TOPICS_FOR_GENERATION[(index * 7 + 3) % TOPICS_FOR_GENERATION.length]
  const difficulty: ProblemDifficulty = index < 34 ? 'Easy' : index < 66 ? 'Medium' : 'Hard'
  const title = `${VERBS[index % VERBS.length]} ${NOUNS[(index * 3) % NOUNS.length]}`
  const id = `p-gen-${index + 1}`
  const slug = `generated-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  const modulus = 3 + (index % 5)
  const arrayInput = `${6 + (index % 4)}\n2 5 1 8 7 3 4 6\n${modulus}`
  const expected = String(18 + (index % 7))

  const skills = TOPIC_SKILLS[topic] ?? ['pattern recognition', 'edge case checks']

  return {
    id,
    slug,
    title,
    difficulty,
    topics: topic === secondaryTopic ? [topic] : [topic, secondaryTopic],
    languageSupport: CODE_LANGUAGE_SUPPORT,
    acceptanceRate: 38 + ((index * 9) % 45),
    estimatedMinutes: difficulty === 'Easy' ? 14 : difficulty === 'Medium' ? 22 : 32,
    keySkills: skills,
    statement: {
      summary: `Use ${topic.toLowerCase()} reasoning to compute the required score efficiently.`,
      description:
        'You are given a sequence of integers. Build a reliable strategy that works for edge cases, keeps complexity under control, and returns the exact required metric for the testcase.',
      input: 'First line contains n. Second line contains n integers. Third line contains parameter k.',
      output: 'Print one integer as the final score for the testcase.',
      constraints: [
        '1 <= n <= 2 * 10^5',
        '0 <= values[i] <= 10^9',
        difficulty === 'Hard' ? 'Aim for O(n log n) or better.' : 'Aim for O(n) or O(n log n).',
      ],
      examples: [
        {
          input: arrayInput,
          output: expected,
          explanation: 'Process the array once and maintain the required state incrementally.',
        },
      ],
    },
    starterByLanguage: { ...GENERIC_STARTERS },
    tests: [
      { input: `${arrayInput}\n`, expected },
      { input: `5\n1 1 1 1 1\n${modulus}\n`, expected: String(5 + (index % 4)) },
    ],
    kind: 'code',
    premium: index % 9 === 0,
    createdAtRank: 100 + index,
  }
}

const GENERATED_PROBLEMS = Array.from({ length: 92 }, (_, index) => buildGeneratedProblem(index))

export const PROBLEMS_BANK: ProblemDefinition[] = [...CURATED_PROBLEMS, ...GENERATED_PROBLEMS]

const problemsById = new Map(PROBLEMS_BANK.map((problem) => [problem.id, problem]))

export const TOPICS_WITH_COUNTS = TOPICS_CATALOG

export function isProblemLanguage(value: string | null): value is ProblemLanguage {
  return value === 'python' || value === 'javascript' || value === 'cpp' || value === 'java' || value === 'sql'
}

export function getProblemById(problemId: string | null) {
  if (!problemId) {
    return null
  }
  return problemsById.get(problemId) ?? null
}

export function getProblemStarterCode(problem: ProblemDefinition, language: ProblemLanguage) {
  if (problem.starterByLanguage[language]) {
    return problem.starterByLanguage[language] ?? ''
  }

  if (problem.kind === 'sql') {
    return problem.starterByLanguage.sql ?? SQL_STARTER
  }

  if (language === 'sql') {
    return SQL_STARTER
  }

  return problem.starterByLanguage.python ?? GENERIC_STARTERS.python
}

export function getDefaultProblemLanguage(problem: ProblemDefinition): ProblemLanguage {
  if (problem.languageSupport.includes('python')) {
    return 'python'
  }
  return problem.languageSupport[0] ?? 'python'
}

export function getSqlCheckerFailures(problem: ProblemDefinition, query: string): string[] {
  if (problem.kind !== 'sql' || !problem.sqlMeta) {
    return []
  }

  const normalized = query.toLowerCase().replace(/\s+/g, ' ')

  if (problem.sqlMeta.checkerId === 'combine_two_tables') {
    const issues: string[] = []
    if (!normalized.includes('select')) {
      issues.push('missing_select')
    }
    if (!(normalized.includes('firstname') && normalized.includes('lastname') && normalized.includes('city') && normalized.includes('state'))) {
      issues.push('missing_columns')
    }
    if (!(normalized.includes('from person') || normalized.includes('from person p'))) {
      issues.push('missing_from_person')
    }
    if (!(normalized.includes('left join') && normalized.includes('address'))) {
      issues.push('missing_left_join')
    }
    if (!(normalized.includes('person.personid = address.personid') || normalized.includes('p.personid = a.personid') || normalized.includes('personid = address.personid') || normalized.includes('p.personid= a.personid') || normalized.includes('p.personid=a.personid'))) {
      issues.push('missing_join_condition')
    }
    return issues
  }

  if (problem.sqlMeta.checkerId === 'second_highest_salary') {
    const issues: string[] = []
    if (!normalized.includes('select')) {
      issues.push('missing_select')
    }
    if (!normalized.includes('salary')) {
      issues.push('missing_columns')
    }
    if (!normalized.includes('employee')) {
      issues.push('missing_from_person')
    }
    if (!(normalized.includes('distinct') || normalized.includes('group by'))) {
      issues.push('missing_distinct')
    }
    return issues
  }

  if (problem.sqlMeta.checkerId === 'department_top_three') {
    const issues: string[] = []
    if (!normalized.includes('select')) {
      issues.push('missing_select')
    }
    if (!normalized.includes('department')) {
      issues.push('missing_department')
    }
    if (!(normalized.includes('join') || normalized.includes('with'))) {
      issues.push('missing_left_join')
    }
    return issues
  }

  return []
}

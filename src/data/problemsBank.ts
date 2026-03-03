import type { PlacementLanguage } from './onboardingData'

export type ProblemLanguage = Extract<PlacementLanguage, 'python' | 'javascript' | 'cpp' | 'java' | 'c'> | 'sql'
export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard'

export type ProblemTopicCount = {
  topic: string
  topicId: string
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
  checkerId: 'combine_two_tables' | 'second_highest_salary' | 'department_top_three' | 'generic_sql'
  requiredTokens?: string[]
  failureKey?: 'missing_query_shape'
}

export type ProblemDefinition = {
  id: string
  slug: string
  title: string
  difficulty: ProblemDifficulty
  topics: string[]
  topicIds?: string[]
  languageSupport: ProblemLanguage[]
  acceptanceRate: number
  estimatedMinutes: number
  timeEstimateMinutes?: number
  keySkills: string[]
  statement: {
    summary: string
    description: string
    input: string
    output: string
    constraints: string[]
    examples: ProblemExample[]
    schemaText?: string
  }
  starterByLanguage: Partial<Record<ProblemLanguage, string>>
  tests: ProblemTestCase[]
  kind: 'code' | 'sql'
  sqlMeta?: SqlProblemMeta
  premium?: boolean
  createdAtRank: number
}

const CODE_LANGUAGE_SUPPORT: ProblemLanguage[] = ['python', 'javascript', 'java', 'cpp', 'c']

const GENERIC_STARTERS: Record<Exclude<ProblemLanguage, 'sql'>, string> = {
  python: `def solve():\n    # TODO: implement\n    pass\n\nif __name__ == "__main__":\n    solve()\n`,
  javascript: `function solve(input) {\n  // TODO: implement\n  return "";\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\nprocess.stdout.write(String(solve(input)));\n`,
  java: `import java.io.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    // TODO: implement\n  }\n}\n`,
  cpp: `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nint main() {\n  // TODO: implement\n  return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main(void) {\n  // TODO: implement\n  return 0;\n}\n`,
}

const SQL_STARTER = `-- Write your SQL query below\nSELECT p.firstName, p.lastName, a.city, a.state\nFROM Person p\nLEFT JOIN Address a ON p.personId = a.personId;\n`

const TOPICS_CATALOG: ProblemTopicCount[] = [
  { topic: 'Array', topicId: 'array', count: 23 },
  { topic: 'String', topicId: 'string', count: 32 },
  { topic: 'Hash Table', topicId: 'hash_table', count: 29 },
  { topic: 'Math', topicId: 'math', count: 15 },
  { topic: 'Dynamic Programming', topicId: 'dynamic_programming', count: 18 },
  { topic: 'Sorting', topicId: 'sorting', count: 11 },
  { topic: 'Greedy', topicId: 'greedy', count: 9 },
  { topic: 'Graph', topicId: 'graph', count: 10 },
  { topic: 'Tree', topicId: 'tree', count: 9 },
  { topic: 'DFS', topicId: 'dfs', count: 7 },
  { topic: 'BFS', topicId: 'bfs', count: 6 },
  { topic: 'Two Pointers', topicId: 'two_pointers', count: 12 },
  { topic: 'Binary Search', topicId: 'binary_search', count: 14 },
  { topic: 'Heap', topicId: 'heap', count: 8 },
  { topic: 'Prefix Sum', topicId: 'prefix_sum', count: 10 },
  { topic: 'Stack', topicId: 'stack', count: 8 },
  { topic: 'Queue', topicId: 'queue', count: 5 },
  { topic: 'Bit Manipulation', topicId: 'bit_manipulation', count: 7 },
  { topic: 'Union-Find', topicId: 'union_find', count: 4 },
  { topic: 'Trie', topicId: 'trie', count: 3 },
  { topic: 'Segment Tree', topicId: 'segment_tree', count: 2 },
  { topic: 'Sliding Window', topicId: 'sliding_window', count: 12 },
  { topic: 'SQL', topicId: 'sql', count: 35 },
  { topic: 'Backtracking', topicId: 'backtracking', count: 5 },
  { topic: 'Monotonic Stack', topicId: 'monotonic_stack', count: 4 },
  { topic: 'Eulerian Circuit', topicId: 'eulerian_circuit', count: 1 },
  { topic: 'Radix Sort', topicId: 'radix_sort', count: 3 },
  { topic: 'Suffix Array', topicId: 'suffix_array', count: 1 },
]

const TOPIC_ID_ALIASES: Record<string, string> = {
  joins: 'join',
  groupby: 'group_by',
}

export function toTopicId(topic: string) {
  const normalized = topic
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return TOPIC_ID_ALIASES[normalized] ?? normalized
}

export function getProblemTopicIds(problem: Pick<ProblemDefinition, 'topics' | 'topicIds'>) {
  const source = problem.topicIds && problem.topicIds.length > 0 ? problem.topicIds : problem.topics
  const unique = new Set(source.map((topic) => toTopicId(topic)))
  return Array.from(unique)
}

export function getProblemTimeEstimateMinutes(
  problem: Pick<ProblemDefinition, 'estimatedMinutes' | 'timeEstimateMinutes'>,
) {
  return typeof problem.timeEstimateMinutes === 'number'
    ? problem.timeEstimateMinutes
    : problem.estimatedMinutes
}

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
      c: `#include <stdio.h>\n\nint main(void) {\n  // TODO\n  printf("-1 -1");\n  return 0;\n}\n`,
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

const SQL_PERSON_TABLES: SqlTableSchema[] = [
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
      ['3', 'Stone', 'Maya'],
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
      ['2', '3', 'Boston', 'Massachusetts'],
    ],
  },
]

const SQL_EMPLOYEE_TABLES: SqlTableSchema[] = [
  {
    name: 'Employee',
    columns: [
      { name: 'id', type: 'int' },
      { name: 'name', type: 'varchar' },
      { name: 'salary', type: 'int' },
      { name: 'departmentId', type: 'int' },
      { name: 'managerId', type: 'int' },
    ],
    rows: [
      ['1', 'Asha', '90000', '10', '5'],
      ['2', 'Nikhil', '120000', '10', '5'],
      ['3', 'Riya', '110000', '20', '6'],
      ['4', 'Tanvi', '80000', '20', '6'],
      ['5', 'Sam', '150000', '10', '0'],
      ['6', 'Neel', '145000', '20', '0'],
    ],
  },
  {
    name: 'Department',
    columns: [
      { name: 'id', type: 'int' },
      { name: 'name', type: 'varchar' },
    ],
    rows: [
      ['10', 'Platform'],
      ['20', 'Payments'],
    ],
  },
]

const SQL_CUSTOMER_ORDER_TABLES: SqlTableSchema[] = [
  {
    name: 'Customers',
    columns: [
      { name: 'customerId', type: 'int' },
      { name: 'name', type: 'varchar' },
      { name: 'city', type: 'varchar' },
      { name: 'createdAt', type: 'date' },
    ],
    rows: [
      ['1', 'Isha', 'Bengaluru', '2025-01-01'],
      ['2', 'Arjun', 'Pune', '2025-01-03'],
      ['3', 'Meera', 'Delhi', '2025-01-10'],
    ],
  },
  {
    name: 'Orders',
    columns: [
      { name: 'orderId', type: 'int' },
      { name: 'customerId', type: 'int' },
      { name: 'amount', type: 'decimal' },
      { name: 'status', type: 'varchar' },
      { name: 'orderDate', type: 'date' },
    ],
    rows: [
      ['101', '1', '2500', 'paid', '2025-01-12'],
      ['102', '1', '1200', 'paid', '2025-01-14'],
      ['103', '2', '3400', 'refunded', '2025-01-17'],
      ['104', '3', '900', 'paid', '2025-01-18'],
    ],
  },
]

const SQL_SALES_TABLES: SqlTableSchema[] = [
  {
    name: 'Sales',
    columns: [
      { name: 'saleId', type: 'int' },
      { name: 'product', type: 'varchar' },
      { name: 'region', type: 'varchar' },
      { name: 'amount', type: 'decimal' },
      { name: 'saleDate', type: 'date' },
    ],
    rows: [
      ['1', 'Alpha', 'West', '1200', '2025-01-01'],
      ['2', 'Alpha', 'West', '800', '2025-01-03'],
      ['3', 'Beta', 'North', '1500', '2025-01-03'],
      ['4', 'Gamma', 'South', '700', '2025-01-04'],
    ],
  },
]

const SQL_EVENT_TABLES: SqlTableSchema[] = [
  {
    name: 'Logins',
    columns: [
      { name: 'userId', type: 'int' },
      { name: 'loginAt', type: 'datetime' },
    ],
    rows: [
      ['1', '2025-01-01 08:00:00'],
      ['1', '2025-01-02 09:00:00'],
      ['2', '2025-01-01 11:00:00'],
      ['3', '2025-01-04 10:30:00'],
    ],
  },
]

type AdditionalSqlSeed = {
  title: string
  difficulty: ProblemDifficulty
  topics: string[]
  acceptanceRate: number
  estimatedMinutes: number
  keySkills: string[]
  summary: string
  description: string
  constraints: string[]
  tables: SqlTableSchema[]
  expectedResult: SqlPreviewTable
  requiredTokens: string[]
}

function formatSqlExpected(preview: SqlPreviewTable) {
  const header = preview.columns.join(' | ')
  const rows = preview.rows.map((row) => row.join(' | ')).join('\n')
  return rows ? `${header}\n${rows}` : header
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const SQL_ADDITIONAL_SEEDS: AdditionalSqlSeed[] = [
  {
    title: 'Top Performers Q3',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 51,
    estimatedMinutes: 15,
    keySkills: ['rank', 'filter'],
    summary: 'Find top 3 sales reps by revenue in Q3.',
    description: 'Use rank over partition to get top performers.',
    constraints: ['Order is descending.'],
    tables: SQL_SALES_TABLES,
    expectedResult: { columns: ['rep', 'revenue'], rows: [] },
    requiredTokens: ['select', 'rank', 'over']
  },
  {
    title: 'Inactive Customers Report',
    difficulty: 'Easy',
    topics: ['SQL', 'Filtering'],
    acceptanceRate: 68,
    estimatedMinutes: 9,
    keySkills: ['not in', 'subquery'],
    summary: 'Find customers who placed no orders this year.',
    description: 'Use a subquery or left join to identify inactive accounts.',
    constraints: ['Return list of customerIds.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: { columns: ['customerId'], rows: [] },
    requiredTokens: ['select', 'where', 'not in']
  },
  {
    title: 'Daily Revenue Growth',
    difficulty: 'Hard',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 35,
    estimatedMinutes: 20,
    keySkills: ['lag', 'partition by', 'math'],
    summary: 'Calculate percentage growth in revenue day-over-day.',
    description: 'Compare each days revenue with the previous using LAG().',
    constraints: ['Round to 2 decimal places.'],
    tables: SQL_SALES_TABLES,
    expectedResult: { columns: ['date', 'growth_pct'], rows: [] },
    requiredTokens: ['select', 'lag', 'over', 'round']
  },
  {
    title: 'Frequent Shoppers',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation'],
    acceptanceRate: 72,
    estimatedMinutes: 10,
    keySkills: ['count', 'having'],
    summary: 'List users who made >1 purchases.',
    description: 'Group orders by user and filter using HAVING count > 1.',
    constraints: ['Sort descending by order count.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: { columns: ['customerId', 'total_orders'], rows: [['1', '2']] },
    requiredTokens: ['select', 'count', 'group by', 'having']
  },
  {
    title: 'Monthly Subscription Churn',
    difficulty: 'Hard',
    topics: ['SQL', 'Joins', 'Date Math'],
    acceptanceRate: 40,
    estimatedMinutes: 25,
    keySkills: ['left join', 'date_diff', 'case'],
    summary: 'Calculate churn rate per month.',
    description: 'Determine what fraction of subscribers canceled in a given month.',
    constraints: ['Ignore trial accounts.'],
    tables: SQL_EVENT_TABLES,
    expectedResult: { columns: ['month', 'churn_rate'], rows: [] },
    requiredTokens: ['select', 'count', 'case', 'group by']
  },
  {
    title: 'Manager Hierarchy Depth',
    difficulty: 'Hard',
    topics: ['SQL', 'Recursive CTE'],
    acceptanceRate: 28,
    estimatedMinutes: 30,
    keySkills: ['with recursive', 'join'],
    summary: 'Find the reporting depth of each employee.',
    description: 'Use a recursive CTE to traverse the manager chain.',
    constraints: ['Max depth is 10.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: { columns: ['id', 'depth'], rows: [] },
    requiredTokens: ['with recursive', 'select', 'union all']
  },
  {
    title: 'First and Last Touch Attribution',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 45,
    estimatedMinutes: 18,
    keySkills: ['first_value', 'last_value'],
    summary: 'Determine first and last ad clicked before purchase.',
    description: 'Analyze clickstream events partitioned by user session.',
    constraints: ['Assume single purchase per session.'],
    tables: SQL_EVENT_TABLES,
    expectedResult: { columns: ['user_id', 'first_ad', 'last_ad'], rows: [] },
    requiredTokens: ['select', 'first_value', 'last_value', 'over']
  },
  {
    title: 'Inventory Stockout Prediction',
    difficulty: 'Medium',
    topics: ['SQL', 'Math', 'Aggregation'],
    acceptanceRate: 60,
    estimatedMinutes: 15,
    keySkills: ['avg', 'division'],
    summary: 'Estimate days until items run out of stock.',
    description: 'Divide current stock by 7-day average sales velocity.',
    constraints: ['Omit items already out of stock.'],
    tables: SQL_SALES_TABLES,
    expectedResult: { columns: ['item_id', 'days_left'], rows: [] },
    requiredTokens: ['select', 'sum', 'group by']
  },
  {
    title: 'Overlapping Meeting Rooms',
    difficulty: 'Hard',
    topics: ['SQL', 'Joins', 'Logic'],
    acceptanceRate: 32,
    estimatedMinutes: 22,
    keySkills: ['self join', 'between'],
    summary: 'Detect meeting conflicts in the schedule.',
    description: 'Find pairs of meetings that overlap in time for the same room.',
    constraints: ['Order pairs by start time.'],
    tables: SQL_EVENT_TABLES,
    expectedResult: { columns: ['room', 'meeting_a', 'meeting_b'], rows: [] },
    requiredTokens: ['select', 'join', 'on', 'between']
  },
  {
    title: 'Customer Lifetime Value',
    difficulty: 'Medium',
    topics: ['SQL', 'Aggregation'],
    acceptanceRate: 58,
    estimatedMinutes: 14,
    keySkills: ['sum', 'group by'],
    summary: 'Sum all net payments per user.',
    description: 'Calculate LTV tracking net positive revenue over all time.',
    constraints: ['Include only successful payments.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: { columns: ['customer_id', 'ltv'], rows: [] },
    requiredTokens: ['select', 'sum', 'where', 'group by']
  },
  {
    title: 'Median Order Value',
    difficulty: 'Hard',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 42,
    estimatedMinutes: 20,
    keySkills: ['percentile_cont', 'within group'],
    summary: 'Compute the median transaction amount per country.',
    description: 'Use percentile functions to find exact median order size.',
    constraints: ['Group by country key.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: { columns: ['country', 'median_amount'], rows: [] },
    requiredTokens: ['select', 'percentile_cont']
  },
  {
    title: 'Find Missing Sequence IDs',
    difficulty: 'Medium',
    topics: ['SQL', 'Joins'],
    acceptanceRate: 48,
    estimatedMinutes: 16,
    keySkills: ['generate_series', 'left join', 'is null'],
    summary: 'Identify gaps in chronological invoice numbering.',
    description: 'Compare invoice table against a complete numeric series.',
    constraints: ['Max gap is 1000.'],
    tables: SQL_SALES_TABLES,
    expectedResult: { columns: ['missing_id'], rows: [] },
    requiredTokens: ['select', 'from', 'left join', 'where is null']
  },
  {
    title: 'Employee Retention Grid',
    difficulty: 'Hard',
    topics: ['SQL', 'Pivot', 'Date Math'],
    acceptanceRate: 25,
    estimatedMinutes: 25,
    keySkills: ['case', 'sum', 'date_trunc'],
    summary: 'Build a cohort retention matrix.',
    description: 'Track the % of users retained month 1, month 2, etc.',
    constraints: ['Matrix limited to 12 months.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: { columns: ['cohort', 'm1', 'm2', 'm3'], rows: [] },
    requiredTokens: ['select', 'sum', 'case', 'group by']
  },
  {
    title: 'Discount Code Abuse',
    difficulty: 'Medium',
    topics: ['SQL', 'Aggregation', 'Having'],
    acceptanceRate: 62,
    estimatedMinutes: 12,
    keySkills: ['count', 'having'],
    summary: 'Flag users using new-user promo codes > 1 time.',
    description: 'Group promo usages by device_id or user_id and count.',
    constraints: ['Only analyze code WELCOME10.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: { columns: ['user_id', 'usage_count'], rows: [] },
    requiredTokens: ['select', 'count', 'group by', 'having']
  },
  {
    title: 'Product Category Penetration',
    difficulty: 'Easy',
    topics: ['SQL', 'Joins', 'Math'],
    acceptanceRate: 75,
    estimatedMinutes: 10,
    keySkills: ['join', 'count distinct', 'division'],
    summary: 'What % of active users bought electronics?',
    description: 'Count users buying specific categories vs total users.',
    constraints: ['Round to integer %.'],
    tables: SQL_SALES_TABLES,
    expectedResult: { columns: ['category', 'penetration_pct'], rows: [] },
    requiredTokens: ['select', 'count distinct']
  },
  {
    title: 'Sequel I: City Match Report',
    difficulty: 'Easy',
    topics: ['SQL', 'Join'],
    acceptanceRate: 70,
    estimatedMinutes: 10,
    keySkills: ['left join', 'null handling'],
    summary: 'Return each person with their city and state when available.',
    description: 'Write a query to join Person with Address and show all people even when address data is missing.',
    constraints: ['Keep every person row.', 'Columns must be firstName, lastName, city, state.'],
    tables: SQL_PERSON_TABLES,
    expectedResult: {
      columns: ['firstName', 'lastName', 'city', 'state'],
      rows: [['Allen', 'Wang', 'null', 'null'], ['Bob', 'Alice', 'New York City', 'New York'], ['Maya', 'Stone', 'Boston', 'Massachusetts']],
    },
    requiredTokens: ['select', 'from person', 'left join', 'address'],
  },
  {
    title: 'Sequel II: Highest Earner by Team',
    difficulty: 'Medium',
    topics: ['SQL', 'Join', 'Window Function'],
    acceptanceRate: 54,
    estimatedMinutes: 16,
    keySkills: ['row_number', 'partition by'],
    summary: 'Find the highest paid employee in each department.',
    description: 'Use Department and Employee tables to return department name and top salary holder per department.',
    constraints: ['One row per department.', 'Use deterministic ordering for ties.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'name', 'salary'],
      rows: [['Platform', 'Sam', '150000'], ['Payments', 'Neel', '145000']],
    },
    requiredTokens: ['select', 'row_number', 'partition by', 'order by', 'join department'],
  },
  {
    title: 'Sequel III: Weekly Revenue Rollup',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation', 'Group By'],
    acceptanceRate: 64,
    estimatedMinutes: 12,
    keySkills: ['group by', 'date bucket'],
    summary: 'Aggregate paid order revenue by week.',
    description: 'Compute total paid revenue grouped by week number from Orders.',
    constraints: ['Ignore refunded orders.', 'Sort by week ascending.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['week', 'revenue'],
      rows: [['2', '4600']],
    },
    requiredTokens: ['select', 'sum', 'group by', 'where', 'status'],
  },
  {
    title: 'Sequel IV: Returning Customers',
    difficulty: 'Medium',
    topics: ['SQL', 'Group By', 'Having'],
    acceptanceRate: 58,
    estimatedMinutes: 14,
    keySkills: ['having', 'count'],
    summary: 'Find customers with at least two paid orders.',
    description: 'Return customerId values for customers who placed two or more paid orders.',
    constraints: ['Count only paid orders.', 'Sort by customerId.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId'],
      rows: [['1']],
    },
    requiredTokens: ['select', 'from orders', 'group by', 'having', 'count'],
  },
  {
    title: 'Sequel V: Recent Active Users',
    difficulty: 'Easy',
    topics: ['SQL', 'Date', 'Distinct'],
    acceptanceRate: 66,
    estimatedMinutes: 11,
    keySkills: ['distinct', 'date filter'],
    summary: 'List unique users who logged in during the last seven days.',
    description: 'Use the Logins table and filter recent records to return distinct user IDs.',
    constraints: ['Return unique userId values.', 'Sort ascending.'],
    tables: SQL_EVENT_TABLES,
    expectedResult: {
      columns: ['userId'],
      rows: [['1'], ['2'], ['3']],
    },
    requiredTokens: ['select', 'distinct', 'from logins', 'where'],
  },
  {
    title: 'Department Salary Average',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation', 'Group By'],
    acceptanceRate: 69,
    estimatedMinutes: 10,
    keySkills: ['avg', 'group by'],
    summary: 'Compute average salary by department.',
    description: 'Join Employee with Department and return each department with average salary.',
    constraints: ['Round not required.', 'Sort by department name.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'avgSalary'],
      rows: [['Payments', '95000'], ['Platform', '120000']],
    },
    requiredTokens: ['select', 'avg', 'group by', 'join department'],
  },
  {
    title: 'Employees Without Managers',
    difficulty: 'Easy',
    topics: ['SQL', 'Filtering'],
    acceptanceRate: 72,
    estimatedMinutes: 8,
    keySkills: ['where', 'null'],
    summary: 'Return employees whose managerId is zero or null.',
    description: 'Find top-level managers in the Employee table.',
    constraints: ['Return employee names only.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['name'],
      rows: [['Sam'], ['Neel']],
    },
    requiredTokens: ['select', 'from employee', 'where', 'managerid'],
  },
  {
    title: 'Duplicate Email Accounts',
    difficulty: 'Easy',
    topics: ['SQL', 'Group By', 'Having'],
    acceptanceRate: 63,
    estimatedMinutes: 9,
    keySkills: ['having', 'count'],
    summary: 'Detect duplicate email addresses.',
    description: 'Given Users(email), return duplicated email values.',
    constraints: ['Only repeated emails.', 'Order is not important.'],
    tables: [
      {
        name: 'Users',
        columns: [{ name: 'id', type: 'int' }, { name: 'email', type: 'varchar' }],
        rows: [['1', 'a@x.com'], ['2', 'b@x.com'], ['3', 'a@x.com']],
      },
    ],
    expectedResult: {
      columns: ['email'],
      rows: [['a@x.com']],
    },
    requiredTokens: ['select', 'from users', 'group by', 'having', 'count'],
  },
  {
    title: 'Department Top Three Salaries',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function', 'Join'],
    acceptanceRate: 49,
    estimatedMinutes: 18,
    keySkills: ['dense_rank', 'partition by'],
    summary: 'Return top 3 salaries for each department.',
    description: 'Use ranking logic to list employees whose salary falls in the top three distinct salaries per department.',
    constraints: ['Distinct salary ranks.', 'Include department and employee name.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'name', 'salary'],
      rows: [['Platform', 'Sam', '150000'], ['Platform', 'Nikhil', '120000'], ['Platform', 'Asha', '90000']],
    },
    requiredTokens: ['select', 'dense_rank', 'partition by', 'join department'],
  },
  {
    title: 'Revenue Above Threshold',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation', 'Having'],
    acceptanceRate: 61,
    estimatedMinutes: 11,
    keySkills: ['sum', 'having'],
    summary: 'Find customers whose total paid amount crosses 3000.',
    description: 'Aggregate paid order amounts by customer and keep totals above threshold.',
    constraints: ['Ignore refunded orders.', 'Return customerId and total.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId', 'total'],
      rows: [['1', '3700']],
    },
    requiredTokens: ['select', 'sum', 'group by', 'having', 'status'],
  },
  {
    title: 'Daily Order Count',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation'],
    acceptanceRate: 74,
    estimatedMinutes: 8,
    keySkills: ['count', 'group by'],
    summary: 'Count orders for each day.',
    description: 'Group Orders by orderDate and return daily order count.',
    constraints: ['Sort by date ascending.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['orderDate', 'orders'],
      rows: [['2025-01-12', '1'], ['2025-01-14', '1'], ['2025-01-17', '1'], ['2025-01-18', '1']],
    },
    requiredTokens: ['select', 'count', 'group by', 'order by'],
  },
  {
    title: 'First Order per Customer',
    difficulty: 'Medium',
    topics: ['SQL', 'Subquery', 'Aggregation'],
    acceptanceRate: 57,
    estimatedMinutes: 14,
    keySkills: ['min', 'join'],
    summary: 'Return each customer with their earliest order date.',
    description: 'Compute first order date for each customer using Orders table.',
    constraints: ['Only customers with orders.', 'Sort by customerId.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId', 'firstOrderDate'],
      rows: [['1', '2025-01-12'], ['2', '2025-01-17'], ['3', '2025-01-18']],
    },
    requiredTokens: ['select', 'min', 'group by', 'from orders'],
  },
  {
    title: 'Last Login Per User',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation'],
    acceptanceRate: 71,
    estimatedMinutes: 9,
    keySkills: ['max', 'group by'],
    summary: 'Show the most recent login for each user.',
    description: 'Aggregate Logins to find max(loginAt) by userId.',
    constraints: ['One row per user.', 'Sort by userId.'],
    tables: SQL_EVENT_TABLES,
    expectedResult: {
      columns: ['userId', 'lastLogin'],
      rows: [['1', '2025-01-02 09:00:00'], ['2', '2025-01-01 11:00:00'], ['3', '2025-01-04 10:30:00']],
    },
    requiredTokens: ['select', 'max', 'group by', 'from logins'],
  },
  {
    title: 'Customers Without Orders',
    difficulty: 'Easy',
    topics: ['SQL', 'Join'],
    acceptanceRate: 66,
    estimatedMinutes: 10,
    keySkills: ['left join', 'null filter'],
    summary: 'Find customers that have never placed an order.',
    description: 'Use a LEFT JOIN between Customers and Orders, then filter null order rows.',
    constraints: ['Return customerId and name.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId', 'name'],
      rows: [],
    },
    requiredTokens: ['select', 'from customers', 'left join', 'orders', 'where'],
  },
  {
    title: 'Running Revenue Total',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 52,
    estimatedMinutes: 16,
    keySkills: ['sum over', 'order by'],
    summary: 'Compute cumulative revenue by date.',
    description: 'For paid orders, show orderDate and running sum of amount ordered by date.',
    constraints: ['Use window function.', 'Sort ascending by date.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['orderDate', 'runningRevenue'],
      rows: [['2025-01-12', '2500'], ['2025-01-14', '3700'], ['2025-01-18', '4600']],
    },
    requiredTokens: ['select', 'sum', 'over', 'order by', 'status'],
  },
  {
    title: 'Rank Products by Revenue',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function', 'Aggregation'],
    acceptanceRate: 50,
    estimatedMinutes: 17,
    keySkills: ['rank', 'sum'],
    summary: 'Rank products from highest to lowest total sales.',
    description: 'Aggregate Sales by product, then rank by revenue.',
    constraints: ['Use window ranking.', 'Return product, revenue, rank.'],
    tables: SQL_SALES_TABLES,
    expectedResult: {
      columns: ['product', 'revenue', 'rank'],
      rows: [['Alpha', '2000', '1'], ['Beta', '1500', '2'], ['Gamma', '700', '3']],
    },
    requiredTokens: ['select', 'sum', 'group by', 'rank', 'over'],
  },
  {
    title: 'Monthly Active Customers',
    difficulty: 'Medium',
    topics: ['SQL', 'Distinct', 'Date'],
    acceptanceRate: 55,
    estimatedMinutes: 13,
    keySkills: ['date trunc', 'count distinct'],
    summary: 'Count distinct customers with paid orders per month.',
    description: 'Return month and unique customer count from paid orders.',
    constraints: ['Month granularity.', 'Sort by month.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['month', 'activeCustomers'],
      rows: [['2025-01', '2']],
    },
    requiredTokens: ['select', 'count', 'distinct', 'group by', 'status'],
  },
  {
    title: 'Consecutive Login Days',
    difficulty: 'Hard',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 41,
    estimatedMinutes: 22,
    keySkills: ['lag', 'date diff'],
    summary: 'Find users with logins on at least two consecutive days.',
    description: 'Use window functions to compare each login date with the previous login date.',
    constraints: ['Return unique userId values.'],
    tables: SQL_EVENT_TABLES,
    expectedResult: {
      columns: ['userId'],
      rows: [['1']],
    },
    requiredTokens: ['select', 'lag', 'over', 'datediff'],
  },
  {
    title: 'Department Headcount',
    difficulty: 'Easy',
    topics: ['SQL', 'Join', 'Aggregation'],
    acceptanceRate: 75,
    estimatedMinutes: 8,
    keySkills: ['count', 'join'],
    summary: 'Count employees in each department.',
    description: 'Join Employee and Department to report headcount per department.',
    constraints: ['Include department name.', 'Sort by headcount desc.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'headcount'],
      rows: [['Platform', '3'], ['Payments', '3']],
    },
    requiredTokens: ['select', 'count', 'group by', 'join department'],
  },
  {
    title: 'New vs Returning Split',
    difficulty: 'Medium',
    topics: ['SQL', 'Case', 'Aggregation'],
    acceptanceRate: 53,
    estimatedMinutes: 15,
    keySkills: ['case when', 'group by'],
    summary: 'Split customers into new vs returning based on order count.',
    description: 'Compute order counts per customer, then aggregate into two buckets.',
    constraints: ['Customers with one order are new.', 'Two or more orders are returning.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['segment', 'customers'],
      rows: [['new', '2'], ['returning', '1']],
    },
    requiredTokens: ['select', 'case', 'count', 'group by'],
  },
  {
    title: 'Top Cities by Orders',
    difficulty: 'Medium',
    topics: ['SQL', 'Join', 'Aggregation'],
    acceptanceRate: 56,
    estimatedMinutes: 13,
    keySkills: ['join', 'group by', 'order by'],
    summary: 'Find cities with the most orders.',
    description: 'Join Customers and Orders, then aggregate orders per city.',
    constraints: ['Sort by order count desc.', 'Return top 3 cities.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['city', 'orders'],
      rows: [['Bengaluru', '2'], ['Delhi', '1'], ['Pune', '1']],
    },
    requiredTokens: ['select', 'join orders', 'group by', 'order by', 'limit'],
  },
  {
    title: 'Orders in Last 30 Days',
    difficulty: 'Easy',
    topics: ['SQL', 'Date'],
    acceptanceRate: 73,
    estimatedMinutes: 9,
    keySkills: ['where date'],
    summary: 'Filter orders to the recent 30-day window.',
    description: 'Return order IDs and amounts where orderDate is in the last 30 days.',
    constraints: ['Assume reference date is current_date.', 'Sort by orderDate desc.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['orderId', 'amount'],
      rows: [['104', '900'], ['103', '3400'], ['102', '1200'], ['101', '2500']],
    },
    requiredTokens: ['select', 'from orders', 'where', 'orderdate'],
  },
  {
    title: 'Max Order per Customer',
    difficulty: 'Easy',
    topics: ['SQL', 'Aggregation'],
    acceptanceRate: 67,
    estimatedMinutes: 10,
    keySkills: ['max', 'group by'],
    summary: 'Show maximum order amount per customer.',
    description: 'Aggregate Orders and return each customer with their max amount.',
    constraints: ['Sort by customerId.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId', 'maxAmount'],
      rows: [['1', '2500'], ['2', '3400'], ['3', '900']],
    },
    requiredTokens: ['select', 'max', 'group by', 'from orders'],
  },
  {
    title: 'Average Basket by City',
    difficulty: 'Medium',
    topics: ['SQL', 'Join', 'Aggregation'],
    acceptanceRate: 51,
    estimatedMinutes: 14,
    keySkills: ['avg', 'join'],
    summary: 'Calculate average order amount per customer city.',
    description: 'Join Customers and Orders and compute average amount by city.',
    constraints: ['Include only paid orders.', 'Sort by city name.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['city', 'avgAmount'],
      rows: [['Bengaluru', '1850'], ['Delhi', '900']],
    },
    requiredTokens: ['select', 'avg', 'join orders', 'group by', 'status'],
  },
  {
    title: 'Employee Department Share',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function', 'Aggregation'],
    acceptanceRate: 46,
    estimatedMinutes: 18,
    keySkills: ['window percent', 'partition'],
    summary: 'Compute each employee salary share inside their department.',
    description: 'Return employee name and salary divided by department total salary.',
    constraints: ['Use window or join-based totals.', 'Round not required.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['name', 'department', 'salaryShare'],
      rows: [['Asha', 'Platform', '0.25'], ['Nikhil', 'Platform', '0.33']],
    },
    requiredTokens: ['select', 'sum', 'over', 'partition by'],
  },
  {
    title: 'Revenue by Weekday',
    difficulty: 'Medium',
    topics: ['SQL', 'Date', 'Aggregation'],
    acceptanceRate: 52,
    estimatedMinutes: 15,
    keySkills: ['weekday extraction'],
    summary: 'Aggregate paid revenue by weekday.',
    description: 'Use orderDate to derive weekday and compute total paid amount.',
    constraints: ['Only paid orders.', 'Sort by weekday index.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['weekday', 'revenue'],
      rows: [['Sun', '2500'], ['Tue', '1200'], ['Sat', '900']],
    },
    requiredTokens: ['select', 'sum', 'group by', 'orderdate', 'status'],
  },
  {
    title: 'Inactive Customers 90 Days',
    difficulty: 'Medium',
    topics: ['SQL', 'Subquery', 'Date'],
    acceptanceRate: 44,
    estimatedMinutes: 17,
    keySkills: ['left join', 'date diff'],
    summary: 'Find customers with no orders in the last 90 days.',
    description: 'Return customers where max(orderDate) is older than 90 days or absent.',
    constraints: ['Include never-ordered users.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId', 'name'],
      rows: [],
    },
    requiredTokens: ['select', 'left join', 'max', 'group by', 'having'],
  },
  {
    title: 'Distinct Product Buyers',
    difficulty: 'Easy',
    topics: ['SQL', 'Distinct'],
    acceptanceRate: 77,
    estimatedMinutes: 8,
    keySkills: ['count distinct'],
    summary: 'Count unique buyers per product.',
    description: 'Given OrderItems(product, customerId), count distinct customers by product.',
    constraints: ['One row per product.'],
    tables: [
      {
        name: 'OrderItems',
        columns: [{ name: 'product', type: 'varchar' }, { name: 'customerId', type: 'int' }],
        rows: [['Alpha', '1'], ['Alpha', '2'], ['Alpha', '1'], ['Beta', '1']],
      },
    ],
    expectedResult: {
      columns: ['product', 'buyers'],
      rows: [['Alpha', '2'], ['Beta', '1']],
    },
    requiredTokens: ['select', 'count', 'distinct', 'group by'],
  },
  {
    title: 'Churned Subscriptions',
    difficulty: 'Medium',
    topics: ['SQL', 'Filtering', 'Date'],
    acceptanceRate: 48,
    estimatedMinutes: 14,
    keySkills: ['where', 'date range'],
    summary: 'List subscriptions that ended last month and were not renewed.',
    description: 'Use subscription events to identify churned users.',
    constraints: ['Only last month churns.', 'Unique user IDs.'],
    tables: [
      {
        name: 'Subscriptions',
        columns: [{ name: 'userId', type: 'int' }, { name: 'endedAt', type: 'date' }, { name: 'renewed', type: 'tinyint' }],
        rows: [['1', '2025-01-03', '0'], ['2', '2025-01-08', '1'], ['3', '2025-01-12', '0']],
      },
    ],
    expectedResult: {
      columns: ['userId'],
      rows: [['1'], ['3']],
    },
    requiredTokens: ['select', 'from subscriptions', 'where', 'renewed'],
  },
  {
    title: 'Net Revenue After Refund',
    difficulty: 'Medium',
    topics: ['SQL', 'Case', 'Aggregation'],
    acceptanceRate: 59,
    estimatedMinutes: 13,
    keySkills: ['case when', 'sum'],
    summary: 'Compute net revenue where refunds reduce total.',
    description: 'Treat paid orders as positive and refunded as negative amounts.',
    constraints: ['Single row output with netRevenue column.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['netRevenue'],
      rows: [['1200']],
    },
    requiredTokens: ['select', 'sum', 'case', 'from orders'],
  },
  {
    title: '7-Day Moving Average Sales',
    difficulty: 'Hard',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 39,
    estimatedMinutes: 24,
    keySkills: ['rows between', 'avg over'],
    summary: 'Compute 7-day moving average of daily sales.',
    description: 'Aggregate daily sales first, then compute rolling seven-day average.',
    constraints: ['Return date and movingAvg.', 'Sort by date ascending.'],
    tables: SQL_SALES_TABLES,
    expectedResult: {
      columns: ['saleDate', 'movingAvg'],
      rows: [['2025-01-01', '1200'], ['2025-01-03', '1166.67']],
    },
    requiredTokens: ['select', 'avg', 'over', 'rows between', 'order by'],
  },
  {
    title: 'Median Salary by Department',
    difficulty: 'Hard',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 37,
    estimatedMinutes: 26,
    keySkills: ['percentile', 'window rank'],
    summary: 'Find median salary per department.',
    description: 'Use window ranking to compute median salary for each department.',
    constraints: ['One row per department.', 'Handle even and odd counts.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'medianSalary'],
      rows: [['Platform', '120000'], ['Payments', '110000']],
    },
    requiredTokens: ['select', 'partition by', 'order by', 'row_number'],
  },
  {
    title: 'Top Refunded Customers',
    difficulty: 'Medium',
    topics: ['SQL', 'Aggregation', 'Join'],
    acceptanceRate: 47,
    estimatedMinutes: 15,
    keySkills: ['sum', 'where refunded'],
    summary: 'Rank customers by refunded amount.',
    description: 'Calculate total refunded amount per customer and return top results.',
    constraints: ['Only refunded orders.', 'Sort descending by refunded total.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['customerId', 'refundedAmount'],
      rows: [['2', '3400']],
    },
    requiredTokens: ['select', 'sum', 'where', 'status', 'group by'],
  },
  {
    title: 'Order Gap Between Purchases',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function', 'Date'],
    acceptanceRate: 45,
    estimatedMinutes: 17,
    keySkills: ['lag', 'datediff'],
    summary: 'Measure day gap between consecutive customer orders.',
    description: 'Return orderId, customerId and days since previous order for each customer.',
    constraints: ['Use window functions.', 'Sort by customer and date.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['orderId', 'customerId', 'daysSincePrev'],
      rows: [['102', '1', '2']],
    },
    requiredTokens: ['select', 'lag', 'over', 'order by', 'datediff'],
  },
  {
    title: 'Department Payroll Delta',
    difficulty: 'Medium',
    topics: ['SQL', 'Aggregation', 'Join'],
    acceptanceRate: 43,
    estimatedMinutes: 16,
    keySkills: ['sum', 'difference'],
    summary: 'Compare department payroll to company average payroll.',
    description: 'Compute payroll per department and subtract company-average department payroll.',
    constraints: ['Return department and delta.', 'Round not required.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'delta'],
      rows: [['Platform', '25000'], ['Payments', '-25000']],
    },
    requiredTokens: ['select', 'sum', 'group by', 'join department'],
  },
  {
    title: 'First Purchase Cohort Size',
    difficulty: 'Medium',
    topics: ['SQL', 'Aggregation', 'Date'],
    acceptanceRate: 50,
    estimatedMinutes: 15,
    keySkills: ['min', 'group by'],
    summary: 'Count customers by month of first purchase.',
    description: 'Determine first order month for each customer and aggregate cohort size.',
    constraints: ['Output month and cohortSize.', 'Sort by month.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['cohortMonth', 'cohortSize'],
      rows: [['2025-01', '3']],
    },
    requiredTokens: ['select', 'min', 'group by', 'from orders'],
  },
  {
    title: 'High-Value Order Ratio',
    difficulty: 'Easy',
    topics: ['SQL', 'Case', 'Aggregation'],
    acceptanceRate: 68,
    estimatedMinutes: 11,
    keySkills: ['case', 'avg'],
    summary: 'Compute the ratio of orders above 2000.',
    description: 'Return a single ratio value using conditional aggregation.',
    constraints: ['Use floating-point ratio.', 'Single row result.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['highValueRatio'],
      rows: [['0.5']],
    },
    requiredTokens: ['select', 'avg', 'case', 'from orders'],
  },
  {
    title: 'Distinct Cities Served',
    difficulty: 'Easy',
    topics: ['SQL', 'Distinct', 'Join'],
    acceptanceRate: 76,
    estimatedMinutes: 7,
    keySkills: ['count distinct', 'join'],
    summary: 'Count distinct cities with at least one paid order.',
    description: 'Join Customers and Orders to count active service cities.',
    constraints: ['Only paid orders count.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['cities'],
      rows: [['2']],
    },
    requiredTokens: ['select', 'count', 'distinct', 'join orders', 'status'],
  },
  {
    title: 'Refund Rate by City',
    difficulty: 'Medium',
    topics: ['SQL', 'Case', 'Aggregation', 'Join'],
    acceptanceRate: 42,
    estimatedMinutes: 16,
    keySkills: ['case', 'group by'],
    summary: 'Compute refund ratio for each city.',
    description: 'Join Customers with Orders and compute refunded/total order ratio by city.',
    constraints: ['Return city and refundRate.', 'Sort by refundRate desc.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['city', 'refundRate'],
      rows: [['Pune', '1.0'], ['Bengaluru', '0.0'], ['Delhi', '0.0']],
    },
    requiredTokens: ['select', 'case', 'group by', 'join orders'],
  },
  {
    title: 'Top Manager by Team Salary',
    difficulty: 'Hard',
    topics: ['SQL', 'Join', 'Aggregation'],
    acceptanceRate: 35,
    estimatedMinutes: 24,
    keySkills: ['self join', 'sum'],
    summary: 'Find manager with highest combined direct-report salary.',
    description: 'Self-join Employee on managerId and aggregate report salaries per manager.',
    constraints: ['Return manager name and teamSalary.', 'Single top row.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['manager', 'teamSalary'],
      rows: [['Sam', '210000']],
    },
    requiredTokens: ['select', 'join employee', 'group by', 'sum', 'order by'],
  },
  {
    title: 'Windowed Department Rank',
    difficulty: 'Medium',
    topics: ['SQL', 'Window Function'],
    acceptanceRate: 47,
    estimatedMinutes: 17,
    keySkills: ['dense_rank', 'partition by'],
    summary: 'Rank employees inside each department by salary.',
    description: 'Return employee, department and salary rank using a window function.',
    constraints: ['Use dense_rank.', 'Sort by department then rank.'],
    tables: SQL_EMPLOYEE_TABLES,
    expectedResult: {
      columns: ['department', 'name', 'salaryRank'],
      rows: [['Platform', 'Sam', '1'], ['Platform', 'Nikhil', '2']],
    },
    requiredTokens: ['select', 'dense_rank', 'over', 'partition by', 'order by'],
  },
  {
    title: 'Order Status Pivot',
    difficulty: 'Medium',
    topics: ['SQL', 'Case', 'Aggregation'],
    acceptanceRate: 52,
    estimatedMinutes: 14,
    keySkills: ['conditional aggregation'],
    summary: 'Return paid and refunded order counts in one row.',
    description: 'Use case expressions to pivot status values into columns.',
    constraints: ['Output paidOrders and refundedOrders.'],
    tables: SQL_CUSTOMER_ORDER_TABLES,
    expectedResult: {
      columns: ['paidOrders', 'refundedOrders'],
      rows: [['3', '1']],
    },
    requiredTokens: ['select', 'sum', 'case', 'from orders'],
  },
]

const ADDITIONAL_SQL_PROBLEMS: ProblemDefinition[] = SQL_ADDITIONAL_SEEDS.slice(0, 33).map((seed, index) => {
  const slug = slugify(seed.title)
  const id = `sql-${slug}`
  const starter =
    `-- ${seed.summary}\n` +
    '-- Write your SQL query below\n' +
    'SELECT \n' +
    'FROM ;\n'

  return {
    id,
    slug,
    title: seed.title,
    difficulty: seed.difficulty,
    topics: seed.topics,
    languageSupport: ['sql'],
    acceptanceRate: seed.acceptanceRate,
    estimatedMinutes: seed.estimatedMinutes,
    keySkills: seed.keySkills,
    statement: {
      summary: seed.summary,
      description: seed.description,
      input: 'Tables listed in schema.',
      output: 'Return rows matching the required output format.',
      constraints: seed.constraints,
      examples: [
        {
          input: 'schema',
          output: formatSqlExpected(seed.expectedResult),
          explanation: 'Expected output shape shown for reference.',
        },
      ],
    },
    starterByLanguage: {
      sql: starter,
    },
    tests: [
      { input: 'schema', expected: formatSqlExpected(seed.expectedResult) },
    ],
    kind: 'sql',
    sqlMeta: {
      checkerId: 'generic_sql',
      tables: seed.tables,
      expectedResult: seed.expectedResult,
      requiredTokens: seed.requiredTokens,
      failureKey: 'missing_query_shape',
    },
    createdAtRank: 10 + index,
  }
})

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
    createdAtRank: 100 + index,
  }
}

const GENERATED_PROBLEMS = Array.from({ length: 92 }, (_, index) => buildGeneratedProblem(index))

export const PROBLEMS_BANK: ProblemDefinition[] = [
  ...CURATED_PROBLEMS,
  ...ADDITIONAL_SQL_PROBLEMS,
  ...GENERATED_PROBLEMS,
].map((problem) => ({
  ...problem,
  topicIds: getProblemTopicIds(problem),
  timeEstimateMinutes: getProblemTimeEstimateMinutes(problem),
}))

const problemsById = new Map(PROBLEMS_BANK.map((problem) => [problem.id, problem]))

export const TOPICS_WITH_COUNTS = TOPICS_CATALOG

export function isProblemLanguage(value: string | null): value is ProblemLanguage {
  return value === 'python' || value === 'javascript' || value === 'cpp' || value === 'java' || value === 'c' || value === 'sql'
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

  return problem.starterByLanguage[language] ?? GENERIC_STARTERS[language]
}

export function getDefaultProblemLanguage(problem: ProblemDefinition): ProblemLanguage {
  if (problem.languageSupport.includes('python')) {
    return 'python'
  }
  return problem.languageSupport[0] ?? 'python'
}

function normalizeSqlQuery(query: string) {
  return query
    .toLowerCase()
    .replace(/--.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/[.,;()]/g, ' ')
    .replace(/=/g, ' = ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAnyPattern(normalized: string, patterns: string[]) {
  return patterns.some((pattern) => normalized.includes(pattern))
}

export function getSqlCheckerFailures(problem: ProblemDefinition, query: string): string[] {
  if (problem.kind !== 'sql' || !problem.sqlMeta) {
    return []
  }

  const normalized = normalizeSqlQuery(query)

  if (problem.sqlMeta.checkerId === 'combine_two_tables') {
    const issues: string[] = []
    if (!normalized.includes('select')) {
      issues.push('missing_select')
    }
    if (!(normalized.includes('firstname') && normalized.includes('lastname') && normalized.includes('city') && normalized.includes('state'))) {
      issues.push('missing_columns')
    }
    if (!includesAnyPattern(normalized, ['from person', 'from person p'])) {
      issues.push('missing_from_person')
    }
    if (!(normalized.includes('left join') && normalized.includes('address'))) {
      issues.push('missing_left_join')
    }
    if (!includesAnyPattern(normalized, [
      'on p personid = a personid',
      'on person personid = address personid',
      'on p personid = address personid',
      'on personid = personid',
      'person personid = address personid',
      'p personid = a personid',
    ])) {
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

  if (problem.sqlMeta.checkerId === 'generic_sql') {
    const requiredTokens = problem.sqlMeta.requiredTokens ?? []
    const missingRequiredToken = requiredTokens.some((token) => !normalized.includes(normalizeSqlQuery(token)))
    if (!missingRequiredToken) {
      return []
    }
    return [problem.sqlMeta.failureKey ?? 'missing_query_shape']
  }

  return []
}

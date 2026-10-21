import type { SeedTestItem, TestSeries } from '@/types/tests'

/**
 * Seed library of TESTS (kind = 'test').
 * Quizzes live in ./quizzes.ts. Seeding is idempotent and never overwrites
 * rows the user has edited (see seedTestsLibrary in src/actions/tests.ts).
 */

type Row = {
  /** Title suffix (appended to the subject prefix) or full title when `full` is true */
  t: string
  topics: string
  series?: TestSeries
  soon?: boolean
  notes?: string
  full?: boolean
}

function build(category: string, defaultSeries: TestSeries, rows: Row[], prefix?: string): SeedTestItem[] {
  return rows.map((r, i) => ({
    kind: 'test',
    category,
    series: r.series ?? defaultSeries,
    title: r.full ? r.t : `${prefix ?? category} — ${r.t}`,
    topics: r.topics,
    tier: null,
    is_available: !r.soon,
    notes: r.notes ?? null,
    display_order: i,
  }))
}

/** Topic tests + subject tests for a standard subject. */
function subject(
  category: string,
  topicTests: { topics: string; notes?: string }[],
  subjectSyllabus: string,
  subjectTestCount: number,
  opts: { prefix?: string; soonSubjectTests?: number[] } = {},
): SeedTestItem[] {
  const rows: Row[] = [
    ...topicTests.map((x, i) => ({ t: `Topic Test ${i + 1}`, topics: x.topics, series: 'topic' as const, notes: x.notes })),
    ...Array.from({ length: subjectTestCount }, (_, i) => ({
      t: `Subject Test ${i + 1}`,
      topics: subjectSyllabus,
      series: 'subject' as const,
      soon: opts.soonSubjectTests?.includes(i + 1),
    })),
  ]
  return build(category, 'topic', rows, opts.prefix)
}

const DISCRETE_MATHEMATICS = subject(
  'Discrete Mathematics',
  [
    { topics: 'Propositional logic, First order logic' },
    { topics: 'Set Theory, Functions, Relations, Lattices' },
    { topics: 'Group Theory' },
    { topics: 'Combinatorics' },
    { topics: 'Graph Theory' },
  ],
  'Complete Discrete Maths Syllabus',
  3,
)

// Order follows the source list: Topic 1, Topic 2, Counting 1, Counting 2, Topic 3, 4, 5, then Subject tests.
const ENGINEERING_MATHEMATICS = build('Engineering Mathematics', 'topic', [
  { t: 'Topic Test 1', topics: 'Complete Linear Algebra' },
  { t: 'Topic Test 2', topics: 'Complete Linear Algebra' },
  { t: 'Combinatorics Counting Test 1', topics: 'Counting' },
  { t: 'Combinatorics Counting Test 2', topics: 'Counting' },
  { t: 'Topic Test 3', topics: 'Bayes Theorem, Conditional Probability' },
  { t: 'Topic Test 4', topics: 'Complete Probability' },
  { t: 'Topic Test 5', topics: 'Complete Calculus' },
  { t: 'Subject Test 1', topics: 'Complete Eng Maths Syllabus', series: 'subject' },
  { t: 'Subject Test 2', topics: 'Complete Eng Maths Syllabus', series: 'subject' },
  { t: 'Subject Test 3', topics: 'Complete Eng Maths Syllabus', series: 'subject' },
])

const DIGITAL_LOGIC = subject(
  'Digital Logic',
  [
    { topics: 'Boolean Algebra, Minimization, Number System' },
    { topics: 'Combinational Circuits' },
    { topics: 'Sequential Circuits' },
    { topics: 'Boolean Algebra, Minimization', notes: 'Extra Test' },
  ],
  'Complete Digital Logic Syllabus',
  3,
)

const DBMS = subject(
  'DBMS',
  [
    { topics: 'Normalization' },
    { topics: 'ER Model, Integrity Constraints' },
    { topics: 'Queries, SQL, TRC, Relational Algebra' },
    { topics: 'Indexing, B Tree, B+ Tree' },
    { topics: 'Transaction management' },
  ],
  'Complete Database Syllabus',
  3,
)

const C_PROGRAMMING = subject(
  'C Programming',
  [
    { topics: 'Number Rep., Control Statements, Operators' },
    { topics: 'Compilation, Storage class, Function, Recursion, Pointers' },
    { topics: 'Pointers, Strings, Structures, DMA' },
  ],
  'Complete C Programming Syllabus',
  3,
)

const DATA_STRUCTURES = subject(
  'Data Structures',
  [
    { topics: 'Linked List' },
    { topics: 'Asymptotic Notations, Loops TC' },
    { topics: 'Stack and Queue' },
    { topics: 'Combinatorics in Trees (BST, AVL, Heap)' },
    { topics: 'Hashing with Probability' },
  ],
  'Complete DS Syllabus',
  3,
)

const ALGORITHMS = subject(
  'Algorithms',
  [
    { topics: 'Divide and Conquer' },
    { topics: 'Recurrence relation' },
    { topics: 'Greedy Algorithms' },
    { topics: 'Dynamic Programming' },
  ],
  'Complete Algorithm Syllabus',
  3,
)

const THEORY_OF_COMPUTATION = subject(
  'Theory of Computation',
  [
    { topics: 'Finite Automata' },
    { topics: 'Regular Expression' },
    { topics: 'CFG, PDA' },
    { topics: 'Closure Properties, Language Class Detection' },
    { topics: 'Decidability, Undecidability' },
    { topics: 'Countability' },
  ],
  'Complete TOC Syllabus',
  3,
)

const COMPILER_DESIGN = subject(
  'Compiler Design',
  [
    { topics: 'Lexical, Syntax Analysis, Parsers' },
    { topics: 'Semantic Analysis, SDT, SDD, Parser' },
    { topics: 'Intermediate Codes, DAG, SSA, Code Optimisation' },
  ],
  'Complete Compiler Syllabus',
  2,
  { soonSubjectTests: [2] },
)

const COMPUTER_ORGANIZATION = subject(
  'Computer Organization and Architecture',
  [
    { topics: 'Basics, Addressing Modes, Control Unit' },
    { topics: 'Pipelining' },
    { topics: 'Cache Memory' },
    { topics: 'I/O Interfacing, Magnetic Disk' },
  ],
  'Complete COA Syllabus',
  3,
  { prefix: 'COA' },
)

const OPERATING_SYSTEM = subject(
  'Operating System',
  [
    { topics: 'Scheduling' },
    { topics: 'Synchronisation, Deadlock' },
    { topics: 'Memory Management' },
    { topics: 'File system, Fork, Systems calls' },
  ],
  'Complete OS Syllabus',
  3,
)

const COMPUTER_NETWORKS = subject(
  'Computer Networks',
  [
    { topics: 'IP addressing, Data Link layer' },
    { topics: 'Network Layer' },
    { topics: 'Routing algorithms, Transport layer' },
    { topics: 'Transport layer, Application Layer' },
  ],
  'Complete CN Syllabus',
  3,
)

const APTITUDE = build(
  'Aptitude',
  'aptitude',
  Array.from({ length: 10 }, (_, i) => ({
    t: `Aptitude Test ${i + 1}`,
    topics: 'Complete Aptitude Syllabus',
    full: true,
  })),
)

const RAPID_FIRE = build(
  'Rapid Fire',
  'rapid',
  [
    {
      t: 'GO Classes GATE CS Test Series | Discrete Mathematics | Combinatorics | Rapid Fire Test 1',
      topics: 'Discrete Mathematics – Combinatorics',
    },
    {
      t: 'GO Classes GATE CS Test Series | Discrete Mathematics | Combinatorics | Rapid Fire Test 2',
      topics: 'Discrete Mathematics – Combinatorics',
    },
    {
      t: 'GO Classes GATE CS/DA Test Series | Linear Algebra | Rapid Fire Test 1',
      topics: 'Engineering Mathematics – Linear Algebra',
    },
    {
      t: 'GO Classes GATE CS Test Series | Digital Logic | Rapid Fire Test 1',
      topics: 'Digital Logic',
    },
    {
      t: 'GO Classes GATE CS Test Series | Computer Network | Rapid Fire Test 1',
      topics: 'Computer Network',
    },
    {
      t: 'GO Classes GATE CS Test Series | Computer Network | Rapid Fire Test 2',
      topics: 'Computer Network',
    },
    {
      t: 'GO Classes GATE CS Test Series | Operating System | Rapid Fire Test 1',
      topics: 'Operating System',
    },
  ].map((r) => ({ ...r, full: true })),
)

const MIXED_FULL_LENGTH = build(
  'Mixed Full Length',
  'mixed',
  [
    { t: 'Mixed Test 1', topics: 'Discrete Mathematics + Engineering Mathematics' },
    { t: 'Mixed Test 2', topics: 'CN + DBMS + TOC + CD' },
    { t: 'Mixed Test 3', topics: 'OS + COA + DL' },
    { t: 'Mixed Test 4', topics: 'C Programming + DSA' },
  ].map((r) => ({ ...r, full: true })),
)

const MOCK_FLT = build(
  'Mock FLT',
  'mock',
  Array.from({ length: 24 }, (_, i) => ({
    t: `GO Classes CS Mock Test ${i + 1}`,
    topics: 'Complete GATE CSE Syllabus',
    soon: i + 1 >= 18,
    full: true,
  })),
)

export const SEED_TESTS: SeedTestItem[] = [
  ...DISCRETE_MATHEMATICS,
  ...ENGINEERING_MATHEMATICS,
  ...DIGITAL_LOGIC,
  ...DBMS,
  ...C_PROGRAMMING,
  ...DATA_STRUCTURES,
  ...ALGORITHMS,
  ...THEORY_OF_COMPUTATION,
  ...COMPILER_DESIGN,
  ...COMPUTER_ORGANIZATION,
  ...OPERATING_SYSTEM,
  ...COMPUTER_NETWORKS,
  ...APTITUDE,
  ...RAPID_FIRE,
  ...MIXED_FULL_LENGTH,
  ...MOCK_FLT,
]

export const SEED_TESTS_COUNT = SEED_TESTS.length

// Dev-only guard: titles must be unique within a category (matches the DB unique key).
if (process.env.NODE_ENV !== 'production') {
  const seen = new Set<string>()
  for (const t of SEED_TESTS) {
    const key = `${t.kind}|${t.category}|${t.title}`
    if (seen.has(key)) throw new Error(`Duplicate seed test: ${key}`)
    seen.add(key)
  }
}

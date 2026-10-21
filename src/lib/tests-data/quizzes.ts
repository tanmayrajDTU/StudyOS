import type { SeedTestItem } from '@/types/tests'

/**
 * Seed library of QUIZZES (kind = 'quiz'). Tests live in ./tests.ts.
 *
 * Source rows are written as `Full name incl. trailing Free/Premium ::: topics`.
 * The tier is parsed off the end of the name and stripped from the title.
 * Obvious typos in the topics column were corrected (Propositional, Automata, CFL/DCFL, continuity).
 */

const SEP = ' ::: '

const RAW: { category: string; rows: string[] }[] = [
  {
    category: 'Free for All',
    rows: [
      'GO Classes GATE CS/DA | Proof Techniques | Weekly Quiz Free ::: Proof Techniques',
      'GO Classes GATE CS/DA | Propositional Logic | Weekly Quiz 1 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Propositional Logic | Weekly Quiz 2 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Propositional Logic | Weekly Quiz 3 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Propositional Logic | Weekly Quiz 4 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Propositional Logic | Weekly Quiz 5 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | First Order Logic | Weekly Quiz 6 Free ::: First Order Logic',
      'GO Classes GATE CS/DA | First Order Logic | Weekly Quiz 7 Free ::: First Order Logic',
      'GO Classes GATE CS | Linear Algebra | Weekly Quiz 1 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Linear Algebra | Weekly Quiz 2 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Linear Algebra | Weekly Quiz 3 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Linear Algebra | Weekly Quiz 4 Free ::: Linear Algebra',
      'GO Classes CS/DA | Fundamental Course | Weekly Quiz 1 Free ::: Fundamental Course',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 1 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 2 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 3 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 4 Free ::: Aptitude',
    ],
  },
  {
    category: 'Engineering Mathematics',
    rows: [
      'GO Classes GATE CS | Engineering Mathematics | Linear Algebra | Weekly Quiz 1 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Engineering Mathematics | Linear Algebra | Weekly Quiz 2 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Engineering Mathematics | Linear Algebra | Weekly Quiz 3 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Engineering Mathematics | Linear Algebra | Weekly Quiz 4 Free ::: Linear Algebra',
      'GO Classes GATE CS/DA | Engineering Mathematics | Linear Algebra | Weekly Quiz 5 Premium ::: Eigen Vectors',
      'GO Classes GATE CS/DA | Engineering Mathematics | Linear Algebra | Weekly Quiz 6 Premium ::: Rank, System of equations',
      'GO Classes CS/DA | Engineering Mathematics | Conditional Probability | Weekly Quiz 1 Premium ::: Probability',
      'GO Classes CS/DA | Engineering Mathematics | Probability Distributions | Weekly Quiz 2 Premium ::: Probability',
      'GO Classes GATE CS/DA | Engineering Mathematics | Calculus | Weekly Quiz 1 Premium ::: Limits, continuity, Maxima-minima, integral calculus',
      'GO Classes GATE CS/DA | Engineering Mathematics | Calculus | Weekly Quiz 2 Premium ::: Calculus',
      'GO Classes GATE CS | Engineering Mathematics | Calculus | Weekly Quiz 3 Premium ::: Calculus',
    ],
  },
  {
    category: 'Discrete Mathematics',
    rows: [
      'GO Classes GATE CS/DA | Discrete Mathematics | Propositional Logic | Weekly Quiz 1 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Discrete Mathematics | Propositional Logic | Weekly Quiz 2 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Discrete Mathematics | Propositional Logic | Weekly Quiz 3 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Discrete Mathematics | Propositional Logic | Weekly Quiz 4 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Discrete Mathematics | Propositional Logic | Weekly Quiz 5 Free ::: Propositional Logic',
      'GO Classes GATE CS/DA | Discrete Mathematics | First Order Logic | Weekly Quiz 6 Free ::: First Order Logic',
      'GO Classes GATE CS/DA | Discrete Mathematics | First Order Logic | Weekly Quiz 7 Free ::: First Order Logic',
      'GO Classes CS | Discrete Mathematics | Set theory | Weekly Quiz 8 Premium ::: Set Theory',
      'GO Classes CS | Discrete Mathematics | Set theory | Weekly Quiz 9 Premium ::: Set Theory',
      'GO Classes CS | Discrete Mathematics | Relations | Weekly Quiz 10 Premium ::: Relations',
      'GO Classes CS | Discrete Mathematics | Relations, Lattice & Poset | Weekly Quiz 11 Premium ::: Relations, Lattice & Poset',
      'GO Classes CS | Discrete Mathematics | Functions | Weekly Quiz 12 Premium ::: Functions',
      'GO Classes GATE CS | Discrete Mathematics | Group Theory | Weekly Quiz 13 Premium ::: Group Theory',
      'GO Classes CS/DA | Discrete Mathematics | Combinatorics | Weekly Quiz 14 Premium ::: Combinatorics',
      'GO Classes CS/DA | Discrete Mathematics | Combinatorics | Weekly Quiz 15 Premium ::: Combinatorics',
      'GO Classes CS/DA | Discrete Mathematics | Combinatorics | Weekly Quiz 16 Premium ::: Combinatorics',
      'GO Classes CS/DA | Discrete Mathematics | Combinatorics | Weekly Quiz 17 Premium ::: Combinatorics',
      'GO Classes GATE CS | Discrete Mathematics | Combinatorics | Weekly Quiz 18 Premium ::: Combinatorics',
      'GO Classes CS | Discrete Mathematics | Graph Theory | Weekly Quiz 19 Premium ::: Graph Theory',
    ],
  },
  {
    category: 'C Programming',
    rows: [
      'GO Classes GATE CS | C-Programming | Number representation & Integer promotion | Weekly Quiz 1 Premium ::: Number representation, Integer promotion',
      'GO Classes GATE CS | C-Programming | Functions, Storage classes & Loops | Weekly Quiz 2 Premium ::: Functions, storage classes, loops',
      'GO Classes GATE CS | C-Programming | Pointers, Storage classes & Recursion | Weekly Quiz 3 Premium ::: Pointers, storage classes, recursion',
      'GO Classes GATE CS | C-Programming | Structures, Pointers & Storage Classes | Weekly Quiz 4 Premium ::: Structures, Pointers, Storage Classes',
    ],
  },
  {
    category: 'Data Structures',
    rows: [
      'GO Classes CS/DA | DS | Asymptotic Notation & Loop Time Complexity | Weekly Quiz 1 Premium ::: Asymptotic Notation and Loop Time Complexity',
      'GO Classes CS/DA | DS | Linked List, Asymptotic Notation & Loop Time Complexity | Weekly Quiz 2 Premium ::: Linked List and Asymptotic Notation and Loop Time Complexity',
      'GO Classes CS/DA | DS | Stack, Queue, Asymptotic Notation & Loop Time Complexity | Weekly Quiz 3 Premium ::: Stack and Queue and Asymptotic Notation and Loop Time Complexity',
      'GO Classes CS/DA | DS | Complete Data structure Syllabus | Weekly Quiz 4 Premium ::: Complete Data Structure',
      'GO Classes CS/DA | DS | Complete Data structure Syllabus | Weekly Quiz 5 Premium ::: Complete Data Structure',
    ],
  },
  {
    category: 'Algorithms',
    rows: [
      'GO Classes CS/DA | Algorithm | Sorting Algorithms | Weekly Quiz 1 Premium ::: Sorting Algorithms',
      'GO Classes CS/DA | Algorithm | BFS and DFS Algorithms | Weekly Quiz 2 Premium ::: BFS and DFS Algorithms',
      'GO Classes CS/DA | Algorithm | Shortest Paths | Weekly Quiz 3 Premium ::: Shortest Paths',
      'GO Classes CS | Algorithm | Minimum Spanning Tree | Weekly Quiz 4 Premium ::: Minimum Spanning Tree',
    ],
  },
  {
    category: 'Digital Logic',
    rows: [
      'GO Classes CS | Digital Logic | Boolean Algebra | Weekly Quiz 1 Premium ::: Boolean Algebra',
      'GO Classes CS | Digital Logic | Boolean Algebra | Weekly Quiz 2 Premium ::: Boolean Algebra',
      'GO Classes CS | Digital Logic | Boolean Algebra | Weekly Quiz 3 Premium ::: Boolean Algebra',
      'GO Classes CS | Digital Logic | Boolean Algebra | Weekly Quiz 4 Premium ::: Boolean Algebra',
      'GO Classes | Digital Logic | Boolean Algebra, Minimization, Number System | Weekly Quiz 5 Premium ::: Boolean Algebra, Minimization, Number System',
      'GO Classes GATE CS | Digital Logic | Number System | Weekly Quiz 6 Premium ::: Number System',
      'GO Classes GATE CS | Digital Logic | Number System | Weekly Quiz 7 Premium ::: Number System',
      'GO Classes GATE CS | Digital Logic | Number System | Weekly Quiz 8 Premium ::: Number System',
      'GO Classes GATE CS | Digital Logic | Number System | Weekly Quiz 9 Premium ::: Number System',
      'GO Classes CS | Digital Logic | Multiplexer | Weekly Quiz 10 Premium ::: Multiplexer',
      'GO Classes CS | Digital Logic | Combinational Circuits, Number System | Weekly Quiz 11 Premium ::: Combinational Circuits',
      'GO Classes CS | Digital Logic | Combinational Circuits | Weekly Quiz 12 Premium ::: Combinational Circuits',
      'GO Classes CS | Digital Logic | K-map | Weekly Quiz 13 Premium ::: K-map',
      'GO Classes CS | Digital Logic | K-map | Weekly Quiz 14 Premium ::: K-map',
    ],
  },
  {
    category: 'Computer Organization and Architecture',
    rows: [
      'GO Classes GATE CS | CO and Architecture | Addressing Modes | Weekly Quiz 1 Premium ::: Addressing Modes',
      'GO Classes GATE CS | CO and Architecture | Instruction Set Architecture | Weekly Quiz 2 Premium ::: Instruction Set Architecture',
      'GO Classes CS | CO and Architecture | Cache Memory | Weekly Quiz 3 Premium ::: Cache Memory',
      'GO Classes CS | CO and Architecture | Cache Memory | Weekly Quiz 4 Premium ::: Cache Memory',
      'GO Classes CS | CO and Architecture | Cache Memory | Weekly Quiz 5 Premium ::: Cache Memory',
      'GO Classes CS | CO and Architecture | Cache Memory | Weekly Quiz 6 Premium ::: Cache Memory',
      'GO Classes CS | CO and Architecture | Cache Memory | Weekly Quiz 7 Premium ::: Cache Memory',
      'GO Classes GATE CS | CO and Architecture | Pipelining | Weekly Quiz 8 Premium ::: Pipelining',
      'GO Classes GATE CS | CO and Architecture | IO Interfacing | Weekly Quiz 9 Premium ::: IO Interfacing',
      "GO Classes CS | CO and Architecture | Floating Point Rep & Booth's Algo | Weekly Quiz 10 Premium ::: Floating Point Rep & Booth's Algo",
    ],
  },
  {
    category: 'Theory of Computation',
    rows: [
      'GO Classes GATE CS | Theory of Computation | Finite Automata | Weekly Quiz 1 Premium ::: Finite Automata',
      'GO Classes GATE CS | Theory of Computation | Finite Automata and Regular Expression | Weekly Quiz 2 Premium ::: Finite Automata and Regular Expression',
      'GO Classes GATE CS | Theory of Computation | Finite Automata and Regular Expression | Weekly Quiz 3 Premium ::: Finite Automata and Regular Expression',
      'GO Classes GATE CS | Theory of Computation | Context Free Grammar | Weekly Quiz 4 Premium ::: Context Free Grammar',
      'GO Classes GATE CS | Theory of Computation | FA, CFL, DCFL | Weekly Quiz 5 Premium ::: FA, CFL, DCFL',
      'GO Classes GATE CS | Theory of Computation | Decidability | Weekly Quiz 6 Premium ::: Decidability',
      'GO Classes GATE CS | Theory of Computation | Decidability | Weekly Quiz 7 Premium ::: Decidability',
      'GO Classes GATE CS | Theory of Computation | Identify Class Language | Weekly Quiz 8 Premium ::: Identify Class Language',
      'GO Classes GATE CS | Theory of Computation | Closure Properties | Weekly Quiz 9 Premium ::: Closure Properties',
      'GO Classes GATE CS | Theory of Computation | Context Free Grammar | Weekly Quiz 10 Premium ::: Context Free Grammar',
      'GO Classes GATE CS | Theory of Computation | Countability | Weekly Quiz 11 Premium ::: Countability',
      'GO Classes GATE CS | Theory of Computation | Pumping Lemma | Weekly Quiz 12 Premium ::: Pumping Lemma (optional)',
    ],
  },
  {
    category: 'Compiler Design',
    rows: [
      'GO Classes CS | Compiler Design | Lexical Analysis | Weekly Quiz 1 Premium ::: Lexical Analysis',
      'GO Classes GATE CS | Compiler Design | Syntax Analysis and Top-Down Parser | Weekly Quiz 2 Premium ::: Syntax Analysis and Top-Down Parser',
      'GO Classes GATE CS | Compiler Design | Bottom Up Parsing | Weekly Quiz 3 Premium ::: Bottom Up Parsing',
      'GO Classes GATE CS | Compiler Design | Syntax Directed Translation & SDD | Weekly Quiz 4 Premium ::: Syntax Directed Translation & SDD',
      'GO Classes GATE CS | Compiler Design | Intermediate Code Generation and Optimization | Weekly Quiz 5 Premium ::: Intermediate Code Generation and Optimization',
    ],
  },
  {
    category: 'DBMS',
    rows: [
      'GO Classes GATE CS/DA | DBMS | Relational Model | Weekly Quiz 1 Premium ::: Relational Model',
      'GO Classes GATE CS/DA | DBMS | Functional Dependency | Weekly Quiz 2 Premium ::: Functional Dependency',
      'GO Classes GATE CS/DA | DBMS | Normalization, Relational Model | Weekly Quiz 3 Premium ::: Normalization, Relational Model',
      'GO Classes GATE CS/DA | DBMS | Normal Forms | Weekly Quiz 4 Premium ::: Normal Forms',
      'GO Classes GATE CS/DA | DBMS | Normalization | Weekly Quiz 5 Premium ::: Normalization',
      'GO Classes GATE CS/DA | DBMS | Normalization | Weekly Quiz 6 Premium ::: Normalization',
      'GO Classes GATE CS/DA | DBMS | Relational Algebra | Weekly Quiz 7 Premium ::: Relational Algebra',
      'GO Classes GATE CS/DA | DBMS | Relational Algebra | Weekly Quiz 8 Premium ::: Relational Algebra',
      'GO Classes GATE CS/DA | DBMS | SQL | Weekly Quiz 9 Premium ::: SQL',
      'GO Classes GATE CS/DA | DBMS | SQL | Weekly Quiz 10 Premium ::: SQL',
      'GO Classes GATE CS/DA | DBMS | SQL | Weekly Quiz 11 Premium ::: SQL',
      'GO Classes GATE CS | DBMS | Disk | Weekly Quiz 12 Premium ::: Disk',
      'GO Classes GATE CS/DA | DBMS | File Organization | Weekly Quiz 13 Premium ::: File Organization',
      'GO Classes GATE CS/DA | DBMS | Indexing | Weekly Quiz 14 Premium ::: Indexing',
      'GO Classes GATE CS/DA | DBMS | B Tree and B+ Tree | Weekly Quiz 15 Premium ::: B Tree and B+ Tree',
      'GO Classes GATE CS | DBMS | Transaction and Concurrency | Weekly Quiz 16 Premium ::: Transaction and Concurrency',
      'GO Classes GATE CS/DA | DBMS | ER Model | Weekly Quiz 17 Premium ::: ER Model',
      'GO Classes GATE CS/DA | DBMS | File Organization | Weekly Quiz 18 Premium ::: File Organization',
    ],
  },
  {
    category: 'Operating System',
    rows: [
      'GO Classes GATE CS | Operating System | Process Synchronization | Weekly Quiz 1 Premium ::: Process Synchronization',
      'GO Classes GATE CS | Operating System | Multi Level Paging | Weekly Quiz 2 Premium ::: Multi Level Paging',
      'GO Classes GATE CS | Operating System | Deadlock | Weekly Quiz 3 Premium ::: Deadlock',
      'GO Classes GATE CS | Operating System | File Systems | Weekly Quiz 4 Premium ::: File Systems',
      'GO Classes GATE CS | Operating System | Threads, System Calls, Fork | Weekly Quiz 5 Premium ::: Threads, System Calls, Fork',
    ],
  },
  {
    category: 'Computer Networks',
    rows: [
      'GO Classes GATE CS | Computer Networks | Subnetting | Weekly Quiz 1 Premium ::: Subnetting',
      'GO Classes GATE CS | Computer Networks | Subnetting | Weekly Quiz 2 Premium ::: Subnetting',
      'GO Classes GATE CS | Computer Networks | Hamming Codes and CRC | Weekly Quiz 3 Premium ::: Hamming Codes and CRC',
      'GO Classes GATE CS | Computer Networks | Flow control | Weekly Quiz 4 Premium ::: Flow control',
      'GO Classes GATE CS | Computer Networks | Network layer | Weekly Quiz 5 Premium ::: Network layer',
      'GO Classes GATE CS | Computer Networks | TCP Protocol | Weekly Quiz 6 Premium ::: TCP Protocol',
      'GO Classes GATE CS | Computer Networks | Complete Computer Networks | Weekly Quiz 7 Premium ::: Complete Computer Networks',
    ],
  },
  {
    category: 'Aptitude',
    rows: [
      'GO Classes CS/DA | Aptitude | Monthly Quiz 1 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 2 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 3 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 4 Free ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 5 Premium ::: Aptitude',
      'GO Classes CS/DA | Aptitude | Monthly Quiz 6 Premium ::: Aptitude',
    ],
  },
]

function parse(category: string, raw: string, order: number): SeedTestItem {
  const [name, topics] = raw.split(SEP)
  const m = name.match(/^(.*) (Free|Premium)$/)
  if (!m) throw new Error(`Quiz row has no Free/Premium tier: ${raw}`)
  const title = m[1]
  return {
    kind: 'quiz',
    category,
    series: /Monthly Quiz/.test(title) ? 'monthly' : 'weekly',
    title,
    topics: topics?.trim() || null,
    tier: m[2] === 'Free' ? 'free' : 'premium',
    is_available: true,
    notes: null,
    display_order: order,
  }
}

const ALL = RAW.flatMap(({ category, rows }) => rows.map((r, i) => parse(category, r, i)))

/**
 * Exact-title duplicates: the same quiz listed under 'Free for All' and under its subject.
 * We keep the subject-specific copy and drop the 'Free for All' one.
 */
const subjectTitles = new Set(ALL.filter((q) => q.category !== 'Free for All').map((q) => q.title))

export const SKIPPED_DUPLICATE_QUIZZES: string[] = ALL.filter(
  (q) => q.category === 'Free for All' && subjectTitles.has(q.title),
).map((q) => q.title)

const FREE_KEPT = ALL.filter((q) => q.category === 'Free for All' && !subjectTitles.has(q.title)).map(
  (q, i): SeedTestItem => ({ ...q, display_order: i }),
)

export const SEED_QUIZZES: SeedTestItem[] = [...FREE_KEPT, ...ALL.filter((q) => q.category !== 'Free for All')]

export const SEED_QUIZZES_COUNT = SEED_QUIZZES.length

// Dev-only guard: titles must be unique within a category (matches the DB unique key).
if (process.env.NODE_ENV !== 'production') {
  const seen = new Set<string>()
  for (const q of SEED_QUIZZES) {
    const key = `${q.kind}|${q.category}|${q.title}`
    if (seen.has(key)) throw new Error(`Duplicate seed quiz: ${key}`)
    seen.add(key)
  }
}

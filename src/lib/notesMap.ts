// Maps a StudyOS subject's name to one or more pages in the static
// GATE CSE prep notes site (served from /public/notes).
//
// The notes site is a standalone static HTML bundle (its own theme/nav),
// so we just deep-link to it rather than trying to render it inside the
// app shell. Subject names are user-editable, so matching is done via
// normalized keyword aliases rather than an exact string match.

export interface NotesLink {
  slug: string
  label: string
  href: string
}

// slug -> display label, must match the file names under public/notes/subjects/
const NOTES_PAGES: Record<string, string> = {
  'digital-logic': 'Digital Logic',
  'c-programming': 'C Programming',
  'data-structures': 'Data Structures',
  'algorithms': 'Algorithms',
  'operating-systems': 'Operating Systems',
  'theory-of-computation': 'Theory of Computation',
  'discrete-mathematics': 'Discrete Mathematics',
  'compiler-design': 'Compiler Design',
  'dbms': 'DBMS',
  'computer-organization': 'Computer Organization',
  'linear-algebra': 'Linear Algebra',
  'calculus': 'Calculus',
  'probability-statistics': 'Probability & Statistics',
  'aptitude': 'Aptitude',
  'computer-networks': 'Computer Networks',
  'analysis': 'Trend Analysis',
}

// slug -> keywords that, if found in a normalized subject name, count as a match.
// Ordered roughly by specificity; a subject can match more than one slug
// (e.g. a combined "Programming and Data Structures" subject).
const ALIASES: Record<string, string[]> = {
  'digital-logic': ['digital logic', 'digital electronics'],
  'c-programming': ['c programming', 'programming in c', ' c '],
  'data-structures': ['data structure'],
  'algorithms': ['algorithm'],
  'operating-systems': ['operating system'],
  'theory-of-computation': ['theory of computation', 'automata'],
  'discrete-mathematics': ['discrete math'],
  'compiler-design': ['compiler'],
  'dbms': ['dbms', 'database'],
  'computer-organization': ['computer organization', 'computer organisation', 'computer architecture'],
  'linear-algebra': ['linear algebra'],
  'calculus': ['calculus'],
  'probability-statistics': ['probability', 'statistics'],
  'aptitude': ['aptitude'],
  'computer-networks': ['computer network'],
  'analysis': ['trend analysis', 'pyq analysis'],
}

function normalize(name: string): string {
  return ` ${name.toLowerCase().trim()} `
}

export function getNotesLinksForSubject(subjectName: string): NotesLink[] {
  const normalized = normalize(subjectName)
  const matches: NotesLink[] = []

  for (const [slug, keywords] of Object.entries(ALIASES)) {
    const isMatch = keywords.some((kw) => normalized.includes(kw))
    if (isMatch) {
      matches.push({
        slug,
        label: NOTES_PAGES[slug],
        href: `/notes/subjects/${slug}.html`,
      })
    }
  }

  return matches
}

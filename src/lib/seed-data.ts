export interface SeedLecture {
  title: string
  estimatedHours: number
}

export interface SeedModule {
  name: string
  isImportant?: boolean
  lectures: SeedLecture[]
}

export interface SeedSubject {
  name: string
  icon: string
  color: string
  modules: SeedModule[]
}

export const SEED_SUBJECTS: SeedSubject[] = [
  {
    name: 'Discrete Mathematics',
    icon: 'Binary',
    color: '#3b82f6',
    modules: [
      {
        name: 'Mathematical Logic',
        lectures: [
          { title: 'Propositional Logic', estimatedHours: 4.0 },
          { title: 'First Order Logic', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Sets, Relations, Functions, Partial Orders and Lattices',
        lectures: [
          { title: 'Sets and Relations', estimatedHours: 4.0 },
          { title: 'Functions', estimatedHours: 3.0 },
          { title: 'Partial Orders and Lattices', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Algebraic Structures',
        lectures: [
          { title: 'Monoids and Groups', estimatedHours: 6.0 }
        ]
      },
      {
        name: 'Graph Theory',
        isImportant: true,
        lectures: [
          { title: 'Graph Connectivity', estimatedHours: 4.0 },
          { title: 'Graph Matching', estimatedHours: 3.0 },
          { title: 'Graph Colouring', estimatedHours: 3.0 }
        ]
      },
      {
        name: 'Combinatorics',
        lectures: [
          { title: 'Permutations and Combinations', estimatedHours: 4.0 },
          { title: 'Recurrence Relations', estimatedHours: 4.0 },
          { title: 'Generating Functions', estimatedHours: 5.0 }
        ]
      }
    ]
  },
  {
    name: 'Linear Algebra',
    icon: 'Grid',
    color: '#10b981',
    modules: [
      {
        name: 'Matrices and Determinants',
        lectures: [
          { title: 'Matrices and Basic Operations', estimatedHours: 4.0 },
          { title: 'Determinants and Properties', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Systems of Linear Equations',
        lectures: [
          { title: 'Solving Linear Systems', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Eigenvalues and Eigenvectors',
        lectures: [
          { title: 'Eigenvalues and Eigenvectors Calculation', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'LU Decomposition',
        lectures: [
          { title: 'LU Decomposition Method', estimatedHours: 3.0 }
        ]
      }
    ]
  },
  {
    name: 'Calculus',
    icon: 'TrendingUp',
    color: '#8b5cf6',
    modules: [
      {
        name: 'Limits, Continuity, and Differentiability',
        lectures: [
          { title: 'Limits and Continuity', estimatedHours: 5.0 },
          { title: 'Differentiability', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Maxima and Minima',
        lectures: [
          { title: 'Single Variable Maxima & Minima', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Mean Value Theorems',
        lectures: [
          { title: 'Rolle\'s and Lagrange\'s MVT', estimatedHours: 3.0 }
        ]
      },
      {
        name: 'Integration',
        lectures: [
          { title: 'Definite and Indefinite Integrals', estimatedHours: 5.0 }
        ]
      }
    ]
  },
  {
    name: 'Probability and Statistics',
    icon: 'BarChart2',
    color: '#f59e0b',
    modules: [
      {
        name: 'Basic Probability & Bayes Theorem',
        lectures: [
          { title: 'Conditional Probability & Bayes Theorem', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Random Variables & Distributions',
        lectures: [
          { title: 'Uniform & Exponential Distributions', estimatedHours: 4.0 },
          { title: 'Normal & Binomial Distributions', estimatedHours: 5.0 },
          { title: 'Poisson Distribution', estimatedHours: 3.0 }
        ]
      },
      {
        name: 'Mathematical Statistics',
        lectures: [
          { title: 'Mean, Median, Mode', estimatedHours: 3.0 },
          { title: 'Standard Deviation & Variance', estimatedHours: 3.0 }
        ]
      }
    ]
  },
  {
    name: 'Digital Logic',
    icon: 'Cpu',
    color: '#ec4899',
    modules: [
      {
        name: 'Boolean Algebra & Minimization',
        lectures: [
          { title: 'Boolean Algebra Laws', estimatedHours: 4.0 },
          { title: 'K-Maps Minimization', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Combinational Circuits',
        lectures: [
          { title: 'Multiplexers & Decoders', estimatedHours: 5.0 },
          { title: 'Adders & Subtractors', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Sequential Circuits',
        lectures: [
          { title: 'Latches & Flip-Flops', estimatedHours: 5.0 },
          { title: 'Counters & Shift Registers', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Number Representations & Computer Arithmetic',
        lectures: [
          { title: 'Signed Number Representations', estimatedHours: 3.0 },
          { title: 'Fixed and Floating Point Arithmetic', estimatedHours: 4.0 }
        ]
      }
    ]
  },
  {
    name: 'Computer Organization and Architecture',
    icon: 'Server',
    color: '#ef4444',
    modules: [
      {
        name: 'Machine Instructions & Addressing Modes',
        lectures: [
          { title: 'Machine Instruction Formats', estimatedHours: 5.0 },
          { title: 'Addressing Modes', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'CPU Design (ALU & Data-Path)',
        lectures: [
          { title: 'ALU and Control Unit Design', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Instruction Pipelining',
        lectures: [
          { title: 'Pipelining Basics', estimatedHours: 4.0 },
          { title: 'Pipeline Hazards', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Memory Hierarchy',
        lectures: [
          { title: 'Cache Memory Mapping', estimatedHours: 5.0 },
          { title: 'Main and Secondary Storage', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'I/O Interface',
        lectures: [
          { title: 'Interrupts and DMA Mode', estimatedHours: 4.0 }
        ]
      }
    ]
  },
  {
    name: 'Programming and Data Structures',
    icon: 'Code',
    color: '#06b6d4',
    modules: [
      {
        name: 'Programming in C & Recursion',
        lectures: [
          { title: 'C Programming Basics', estimatedHours: 5.0 },
          { title: 'Recursion Concepts', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Linear Data Structures',
        lectures: [
          { title: 'Arrays & Linked Lists', estimatedHours: 5.0 },
          { title: 'Stacks & Queues', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Non-Linear Data Structures',
        lectures: [
          { title: 'Binary Trees & BSTs', estimatedHours: 6.0 },
          { title: 'Binary Heaps', estimatedHours: 4.0 },
          { title: 'Graphs Representation', estimatedHours: 3.0 }
        ]
      }
    ]
  },
  {
    name: 'Algorithms',
    icon: 'GitBranch',
    color: '#6366f1',
    modules: [
      {
        name: 'Complexity & Basic Algorithms',
        lectures: [
          { title: 'Asymptotic Analysis', estimatedHours: 4.0 },
          { title: 'Searching & Sorting', estimatedHours: 5.0 },
          { title: 'Hashing', estimatedHours: 3.0 }
        ]
      },
      {
        name: 'Algorithm Design Techniques',
        lectures: [
          { title: 'Greedy Algorithms', estimatedHours: 4.0 },
          { title: 'Dynamic Programming', estimatedHours: 6.0 },
          { title: 'Divide-and-Conquer', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Graph Algorithms',
        lectures: [
          { title: 'BFS and DFS Traversals', estimatedHours: 4.0 },
          { title: 'Minimum Spanning Trees', estimatedHours: 4.0 },
          { title: 'Shortest Paths', estimatedHours: 5.0 }
        ]
      }
    ]
  },
  {
    name: 'Theory of Computation',
    icon: 'Activity',
    color: '#f43f5e',
    modules: [
      {
        name: 'Regular Languages & Finite Automata',
        lectures: [
          { title: 'Finite Automata (DFA, NFA)', estimatedHours: 5.0 },
          { title: 'Regular Expressions & Pumping Lemma', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Context-Free Languages & Pushdown Automata',
        lectures: [
          { title: 'Context-Free Grammars (CFG)', estimatedHours: 5.0 },
          { title: 'Pushdown Automata (PDA) & Pumping Lemma', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Turing Machines & Undecidability',
        lectures: [
          { title: 'Turing Machines', estimatedHours: 5.0 },
          { title: 'Decidability & Halting Problem', estimatedHours: 5.0 }
        ]
      }
    ]
  },
  {
    name: 'Compiler Design',
    icon: 'Layers',
    color: '#14b8a6',
    modules: [
      {
        name: 'Lexical & Syntax Analysis',
        lectures: [
          { title: 'Lexical Analysis', estimatedHours: 4.0 },
          { title: 'Parsing Techniques (LL, LR)', estimatedHours: 7.0 }
        ]
      },
      {
        name: 'Translation & Intermediate Code',
        lectures: [
          { title: 'Syntax-Directed Translation', estimatedHours: 5.0 },
          { title: 'Runtime Environments', estimatedHours: 3.0 },
          { title: 'Intermediate Code Generation', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Optimization & Data Flow Analysis',
        lectures: [
          { title: 'Local Optimization', estimatedHours: 4.0 },
          { title: 'Data Flow Analyses (Constant Propagation, Liveness)', estimatedHours: 5.0 }
        ]
      }
    ]
  },
  {
    name: 'Operating System',
    icon: 'Sliders',
    color: '#a855f7',
    modules: [
      {
        name: 'Processes and Threads',
        lectures: [
          { title: 'Processes & System Calls', estimatedHours: 5.0 },
          { title: 'Threads & IPC', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'CPU Scheduling & Synchronization',
        lectures: [
          { title: 'CPU Scheduling Algorithms', estimatedHours: 4.0 },
          { title: 'Concurrency & Synchronization', estimatedHours: 6.0 }
        ]
      },
      {
        name: 'Deadlock & Memory Management',
        lectures: [
          { title: 'Deadlock Prevention & Detection', estimatedHours: 4.0 },
          { title: 'Paging & Virtual Memory', estimatedHours: 6.0 }
        ]
      },
      {
        name: 'Storage & File Systems',
        lectures: [
          { title: 'File Systems', estimatedHours: 4.0 },
          { title: 'Disk Scheduling', estimatedHours: 3.0 }
        ]
      }
    ]
  },
  {
    name: 'Databases',
    icon: 'Database',
    color: '#059669',
    modules: [
      {
        name: 'Database Design & ER-Model',
        lectures: [
          { title: 'ER Model & Relational Model', estimatedHours: 4.0 }
        ]
      },
      {
        name: 'Relational Query Languages',
        lectures: [
          { title: 'Relational Algebra & Tuple Calculus', estimatedHours: 5.0 },
          { title: 'SQL Queries', estimatedHours: 6.0 }
        ]
      },
      {
        name: 'Normalization & Integrity',
        lectures: [
          { title: 'Functional Dependencies & Normal Forms', estimatedHours: 6.0 }
        ]
      },
      {
        name: 'Storage & Transactions',
        lectures: [
          { title: 'B and B+ Trees Indexing', estimatedHours: 5.0 },
          { title: 'Transactions & Concurrency Control', estimatedHours: 5.0 }
        ]
      }
    ]
  },
  {
    name: 'Computer Networks',
    icon: 'Globe',
    color: '#2563eb',
    modules: [
      {
        name: 'Network Layering & Basics',
        lectures: [
          { title: 'OSI & TCP/IP Layering', estimatedHours: 4.0 },
          { title: 'Packet & Circuit Switching', estimatedHours: 3.0 }
        ]
      },
      {
        name: 'Data Link & Routing',
        lectures: [
          { title: 'Framing, Error Control & Ethernet', estimatedHours: 5.0 },
          { title: 'Distance Vector & Link State Routing', estimatedHours: 6.0 }
        ]
      },
      {
        name: 'IP Addressing & Protocols',
        lectures: [
          { title: 'IPv4 Addressing & CIDR Notation', estimatedHours: 5.0 },
          { title: 'ARP, DHCP, ICMP, NAT', estimatedHours: 5.0 }
        ]
      },
      {
        name: 'Transport & Application Layers',
        lectures: [
          { title: 'TCP congestion control & Sockets', estimatedHours: 6.0 },
          { title: 'DNS, SMTP, HTTP, FTP, Email', estimatedHours: 5.0 }
        ]
      }
    ]
  }
]

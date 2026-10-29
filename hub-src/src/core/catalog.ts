// The catalog: subjects, topics, role and company profiles.
// Pure data. Adding a subject, role or company is an edit here, never a code change elsewhere.

export type SubjectId = "dsa" | "oops" | "os" | "dbms" | "cn" | "lld" | "sd";
export type Kind = "coding" | "concept" | "design";

export interface Topic {
  id: string;
  name: string;
  hours: number;   // estimated hours to learn and practise it properly
  level: 1 | 2 | 3; // 1 foundation, 2 core, 3 advanced
}
export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  kind: Kind;
  topics: Topic[];
}

const t = (id: string, name: string, hours: number, level: 1 | 2 | 3): Topic => ({ id, name, hours, level });

export const SUBJECTS: Subject[] = [
  {
    // Topic names match the DSA practice app's 14 patterns exactly, so progress can be read from it.
    id: "dsa", name: "Data Structures & Algorithms", short: "DSA", kind: "coding",
    topics: [
      t("dsa-arrays", "Arrays & Hashing", 10, 1), t("dsa-two-pointers", "Two Pointers", 6, 1),
      t("dsa-sliding-window", "Sliding Window", 8, 1), t("dsa-stack", "Stack & Monotonic Stack", 8, 1),
      t("dsa-linked-lists", "Linked Lists", 6, 1), t("dsa-binary-search", "Binary Search", 8, 2),
      t("dsa-trees", "Trees", 12, 2), t("dsa-heaps", "Heaps & Top K", 8, 2),
      t("dsa-backtracking", "Backtracking", 8, 2), t("dsa-graphs", "Graphs", 14, 2),
      t("dsa-intervals", "Intervals", 5, 2), t("dsa-greedy", "Greedy", 8, 3),
      t("dsa-tries", "Tries", 5, 3), t("dsa-dp", "Dynamic Programming", 18, 3),
    ],
  },
  {
    id: "oops", name: "Object-Oriented Programming", short: "OOPS", kind: "concept",
    topics: [
      t("oops-classes", "Classes and objects", 2, 1), t("oops-encapsulation", "Encapsulation and abstraction", 2, 1),
      t("oops-inheritance", "Inheritance and composition", 2, 1), t("oops-polymorphism", "Polymorphism", 2, 1),
      t("oops-interfaces", "Interfaces vs abstract classes", 1.5, 1), t("oops-solid", "SOLID principles", 4, 2),
      t("oops-coupling", "Coupling and cohesion", 1.5, 2), t("oops-exceptions", "Exceptions and immutability", 2, 2),
      t("oops-creational", "Creational patterns", 4, 2), t("oops-structural", "Structural patterns", 4, 2),
      t("oops-behavioral", "Behavioral patterns", 5, 3), t("oops-questions", "OOP interview questions", 3, 3),
    ],
  },
  {
    id: "os", name: "Operating Systems", short: "OS", kind: "concept",
    topics: [
      t("os-processes", "Processes and threads", 3, 1), t("os-scheduling", "CPU scheduling", 3, 1),
      t("os-syscalls", "Context switches and system calls", 2, 1), t("os-sync", "Locks, mutexes and semaphores", 4, 2),
      t("os-classic", "Classic synchronisation problems", 3, 2), t("os-deadlocks", "Deadlocks", 3, 2),
      t("os-memory", "Memory management and paging", 4, 2), t("os-virtual", "Virtual memory and page replacement", 3, 2),
      t("os-files", "File systems and I/O", 2, 3), t("os-concurrency", "Concurrency in practice", 3, 3),
      t("os-questions", "OS interview questions", 2, 3),
    ],
  },
  {
    id: "dbms", name: "Database Management Systems", short: "DBMS", kind: "concept",
    topics: [
      t("db-sql", "SQL basics and joins", 4, 1), t("db-sql-advanced", "Aggregation, subqueries, window functions", 4, 1),
      t("db-er", "ER modelling and keys", 2, 1), t("db-normal", "Normalisation", 3, 1),
      t("db-index", "Indexing", 4, 2), t("db-acid", "Transactions and ACID", 3, 2),
      t("db-isolation", "Isolation levels and concurrency control", 4, 2), t("db-optimize", "Query optimisation", 3, 2),
      t("db-nosql", "SQL vs NoSQL", 2, 3), t("db-scale", "Replication and sharding", 3, 3),
      t("db-design", "Schema design problems", 3, 3),
    ],
  },
  {
    id: "cn", name: "Computer Networks", short: "CN", kind: "concept",
    topics: [
      t("cn-models", "OSI and TCP/IP models", 2, 1), t("cn-ip", "IP addressing and subnetting", 2, 1),
      t("cn-tcp", "TCP vs UDP", 3, 1), t("cn-dns", "DNS", 2, 1),
      t("cn-http", "HTTP/1.1, HTTP/2, HTTP/3", 3, 2), t("cn-tls", "HTTPS and TLS", 3, 2),
      t("cn-apis", "REST, WebSockets, gRPC", 3, 2), t("cn-lb", "Load balancers and proxies", 2, 2),
      t("cn-cdn", "CDNs and caching", 2, 3), t("cn-url", "What happens when you open a URL", 2, 3),
    ],
  },
  {
    id: "lld", name: "Low-Level Design", short: "LLD", kind: "design",
    topics: [
      t("lld-uml", "UML and class diagrams", 2, 1), t("lld-requirements", "From requirements to classes", 3, 1),
      t("lld-patterns", "Design patterns in practice", 4, 2), t("lld-parking", "Design: parking lot", 3, 2),
      t("lld-booking", "Design: movie ticket booking", 3, 2), t("lld-elevator", "Design: elevator system", 3, 2),
      t("lld-splitwise", "Design: expense sharing", 3, 2), t("lld-cache", "Design: LRU cache and rate limiter", 3, 3),
      t("lld-games", "Design: chess or snake and ladder", 3, 3), t("lld-concurrency", "Thread safety in designs", 3, 3),
      t("lld-mocks", "Mock LLD rounds", 4, 3),
    ],
  },
  {
    id: "sd", name: "System Design", short: "System Design", kind: "design",
    topics: [
      t("sd-scale", "Scalability basics", 2, 1), t("sd-estimates", "Latency, throughput, estimates", 3, 1),
      t("sd-lb", "Load balancing", 2, 1), t("sd-cache", "Caching strategies", 3, 2),
      t("sd-databases", "Databases: replication and sharding", 4, 2), t("sd-cap", "Consistency and CAP", 3, 2),
      t("sd-queues", "Message queues and Kafka", 4, 2), t("sd-ratelimit", "Rate limiting and API gateways", 2, 2),
      t("sd-hashing", "Consistent hashing", 2, 2), t("sd-url", "Design: URL shortener", 3, 2),
      t("sd-micro", "Microservices and service discovery", 3, 3), t("sd-observe", "Observability", 2, 3),
      t("sd-reliability", "Reliability: retries, idempotency, circuit breakers", 3, 3),
      t("sd-chat", "Design: chat app", 4, 3), t("sd-feed", "Design: news feed", 4, 3),
      t("sd-ride", "Design: ride sharing", 4, 3), t("sd-mocks", "Mock system design rounds", 4, 3),
    ],
  },
];
export const SUBJECT = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, Subject>;
export const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

// ---------- role profiles ----------
// weights: relative importance (any scale). depth: highest topic level that role needs (1-3).
export interface Role { id: string; name: string; weights: Record<SubjectId, number>; depth: Record<SubjectId, 1 | 2 | 3> }
const all3 = { dsa: 3, oops: 3, os: 3, dbms: 3, cn: 3, lld: 3, sd: 3 } as const;
export const ROLES: Role[] = [
  { id: "sde1", name: "SDE-1", weights: { dsa: 45, oops: 12, dbms: 10, os: 8, cn: 7, lld: 10, sd: 8 }, depth: { ...all3, sd: 2, lld: 2 } },
  { id: "sde2", name: "SDE-2", weights: { dsa: 35, sd: 25, lld: 15, oops: 7, dbms: 7, os: 6, cn: 5 }, depth: all3 },
  { id: "backend", name: "Backend Engineer", weights: { dsa: 30, sd: 20, dbms: 15, lld: 12, cn: 10, os: 8, oops: 5 }, depth: all3 },
  { id: "fullstack", name: "Full Stack Engineer", weights: { dsa: 30, sd: 15, cn: 15, dbms: 12, oops: 10, lld: 10, os: 8 }, depth: { ...all3, os: 2 } },
  { id: "ml", name: "ML Engineer", weights: { dsa: 35, sd: 15, dbms: 12, oops: 12, lld: 8, os: 10, cn: 8 }, depth: { ...all3, lld: 2 } },
  { id: "genai", name: "GenAI Engineer", weights: { dsa: 30, sd: 22, dbms: 12, lld: 12, cn: 10, oops: 7, os: 7 }, depth: all3 },
];

// ---------- company profiles ----------
// adjust: multiplies the role weight. Only DSA has real company data (in the practice app); the rest is judgement.
export interface Company { id: string; name: string; adjust: Partial<Record<SubjectId, number>>; note: string }
export const COMPANIES: Company[] = [
  { id: "google", name: "Google", adjust: { dsa: 1.2, sd: 1.1, lld: 0.8 }, note: "Hard coding rounds, often unseen variants; design depth grows with level." },
  { id: "amazon", name: "Amazon", adjust: { dsa: 1.1, lld: 1.1 }, note: "Leadership Principles in every round; online assessment repeats known problems." },
  { id: "microsoft", name: "Microsoft", adjust: { dsa: 1.1, oops: 1.2, os: 1.1, lld: 1.1 }, note: "Strong fundamentals; OOP and design questions are common." },
  { id: "meta", name: "Meta", adjust: { dsa: 1.25, sd: 1.1, lld: 0.6, oops: 0.8 }, note: "Two fast coding problems per round; product-style system design." },
  { id: "flipkart", name: "Flipkart", adjust: { dsa: 1.15, lld: 1.2, sd: 1.1 }, note: "Machine-coding round; LLD is weighted heavily." },
  { id: "uber", name: "Uber", adjust: { dsa: 1.1, sd: 1.2, lld: 1.1 }, note: "Design-heavy; real-time systems come up often." },
  { id: "servicenow", name: "ServiceNow", adjust: { oops: 1.2, dbms: 1.2, lld: 1.1 }, note: "Fundamentals and OOP; database questions common." },
  { id: "startup", name: "Startup", adjust: { dsa: 0.85, sd: 1.1, lld: 1.1, dbms: 1.1 }, note: "Practical design and building over puzzle-style coding." },
  { id: "other", name: "Other company", adjust: {}, note: "Balanced preparation for the role." },
];

export type Level = "beginner" | "intermediate" | "experienced";
export const LEVELS: { id: Level; name: string; mastery: number; blurb: string }[] = [
  { id: "beginner", name: "Beginner", mastery: 0.15, blurb: "New to most of these topics" },
  { id: "intermediate", name: "Intermediate", mastery: 0.35, blurb: "Know the basics, gaps in places" },
  { id: "experienced", name: "Experienced", mastery: 0.55, blurb: "Mostly revising and sharpening" },
];

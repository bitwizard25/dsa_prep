// Original quiz questions written for this app (not copied from any source).
// Each entry: [question, options, index of the correct option, one-line explanation].
export type Q = [string, string[], number, string];

export const QUIZ: Record<string, Q[]> = {
  // ---------------- OOPS ----------------
  "oops-classes": [
    ["What is the relationship between a class and an object?", ["An object is a blueprint; a class is an instance", "A class is a blueprint; an object is an instance of it", "They are the same thing", "A class can only have one object"], 1, "The class defines structure and behaviour; each object is one concrete instance."],
    ["Where does a non-static field's value live?", ["Shared by all objects of the class", "In each object separately", "Only in the constructor", "In the class file on disk"], 1, "Instance fields are per object; static fields are shared."],
    ["What does a constructor do?", ["Destroys an object", "Initialises a new object's state", "Copies a class", "Declares an interface"], 1, "It runs when an object is created and sets its starting state."],
    ["A static method can directly use which of these?", ["Instance fields without an object", "Only static members", "The 'this' reference", "Private fields of any object without a reference"], 1, "Static methods belong to the class, so there is no 'this' to reach instance state."],
  ],
  "oops-encapsulation": [
    ["Encapsulation mainly means:", ["Hiding internal state and exposing controlled access", "Inheriting from many classes", "Writing everything in one class", "Overloading methods"], 0, "Keep data private and change it only through methods that protect its rules."],
    ["Why make a field private and add a setter?", ["To make the code longer", "So the class can validate or control changes", "Because getters are slower", "To allow inheritance"], 1, "A setter can reject invalid values; a public field cannot."],
    ["Abstraction is best described as:", ["Showing only what's essential and hiding how it works", "Making every method static", "Removing all classes", "Using only interfaces"], 0, "Callers use 'what it does' without depending on 'how'."],
    ["Which breaks encapsulation most?", ["Private fields with methods", "Returning a direct reference to an internal mutable list", "Immutable value objects", "Package-private helpers"], 1, "The caller can now change internal state without the class knowing."],
  ],
  "oops-inheritance": [
    ["Inheritance models which relationship?", ["has-a", "is-a", "uses-a", "depends-on"], 1, "A subclass is a more specific kind of its parent."],
    ["'Favour composition over inheritance' mostly avoids:", ["Too many objects", "Tight coupling to a parent's internals and fragile hierarchies", "Using interfaces", "Garbage collection"], 1, "Composition lets you swap parts without deep, rigid class trees."],
    ["A Car with an Engine field is an example of:", ["Inheritance", "Composition", "Polymorphism", "Overloading"], 1, "Car has-a Engine."],
    ["The diamond problem is about:", ["Two parent classes providing the same method to one child", "Memory leaks", "Recursion depth", "Interface naming"], 0, "With multiple inheritance it's ambiguous which parent's version wins."],
  ],
  "oops-polymorphism": [
    ["Method overriding is resolved at:", ["Compile time", "Run time", "Link time", "Never"], 1, "The actual object's type decides which version runs (dynamic dispatch)."],
    ["Method overloading means:", ["Same name, different parameter lists", "Same signature in a subclass", "A method calling itself", "A method with no body"], 0, "Overloads are chosen at compile time from the arguments."],
    ["Calling shape.area() on a list of mixed shapes shows:", ["Encapsulation", "Runtime polymorphism", "Static binding", "Composition"], 1, "One call, different behaviour per concrete type."],
    ["Which can NOT be overridden in Java?", ["Public methods", "Protected methods", "Static methods", "Abstract methods"], 2, "Static methods are hidden, not overridden."],
  ],
  "oops-interfaces": [
    ["Main difference between an interface and an abstract class (classic Java/C#)?", ["Interfaces can hold instance state", "A class can implement many interfaces but extend one class", "Abstract classes can't have methods", "Interfaces must be instantiated"], 1, "Multiple interfaces, single base class."],
    ["When is an abstract class the better choice?", ["When unrelated types share a capability", "When related types share state and some implementation", "When you need many parents", "Never"], 1, "It can hold shared fields and default logic for a family of classes."],
    ["Can you create an object of an abstract class directly?", ["Yes", "No", "Only in C++", "Only if it has a constructor"], 1, "You instantiate a concrete subclass instead."],
    ["An interface mainly defines:", ["A contract of behaviour", "Memory layout", "A singleton", "Database schema"], 0, "It says what an implementer must do, not how."],
  ],
  "oops-solid": [
    ["Single Responsibility Principle means a class should:", ["Have one method", "Have one reason to change", "Be used once", "Have no dependencies"], 1, "Mixing concerns means unrelated changes break each other."],
    ["Open/Closed Principle: classes should be:", ["Open for modification, closed for extension", "Open for extension, closed for modification", "Always final", "Always public"], 1, "Add behaviour by extending, not by editing tested code."],
    ["A Square subclass breaking code written for Rectangle violates:", ["Single Responsibility", "Liskov Substitution", "Interface Segregation", "Dependency Inversion"], 1, "Subtypes must work anywhere the parent type is expected."],
    ["Dependency Inversion says high-level code should depend on:", ["Concrete classes", "Abstractions", "Global variables", "The database"], 1, "Both sides depend on an interface, so either can change."],
  ],
  "oops-coupling": [
    ["The goal for good design is:", ["High coupling, low cohesion", "Low coupling, high cohesion", "High coupling, high cohesion", "Low coupling, low cohesion"], 1, "Modules focused inside, loosely connected outside."],
    ["High cohesion means a module's parts:", ["Are unrelated", "Work toward one clear purpose", "Are all static", "Share global state"], 1, "Everything in it belongs together."],
    ["Which reduces coupling?", ["Calling concrete classes everywhere", "Depending on interfaces and injecting dependencies", "Shared global variables", "Deep inheritance"], 1, "Callers no longer know the concrete implementation."],
    ["A 'God class' usually has:", ["Low cohesion and high coupling", "High cohesion", "No methods", "Only interfaces"], 0, "It does everything and everything depends on it."],
  ],
  "oops-exceptions": [
    ["An immutable object:", ["Can change after creation", "Cannot change state after construction", "Has no fields", "Must be static"], 1, "Its state is fixed once built, which makes it safe to share."],
    ["Why are immutable objects thread-safe?", ["They use locks", "No thread can change their state", "They're slower", "They live on the stack"], 1, "No writes means no data races."],
    ["Checked exceptions (Java) must be:", ["Ignored", "Caught or declared in the method signature", "Only runtime errors", "Thrown by the JVM only"], 1, "The compiler forces you to handle or declare them."],
    ["Swallowing an exception (empty catch) is bad because:", ["It's slow", "Failures disappear silently and are hard to debug", "It leaks memory", "It's illegal"], 1, "The error happened; now nobody will know why."],
  ],
  "oops-creational": [
    ["Singleton guarantees:", ["One instance with a global access point", "One method per class", "No constructors", "Many instances"], 0, "Often used for config or connection pools; overuse hides dependencies."],
    ["Factory Method is used to:", ["Delete objects", "Let a method decide which concrete class to create", "Copy objects", "Make classes immutable"], 1, "Callers ask for a product without naming its class."],
    ["Builder is most useful when an object has:", ["One field", "Many optional parameters", "No constructor", "Only static methods"], 1, "It avoids telescoping constructors and reads clearly."],
    ["Prototype creates new objects by:", ["Cloning an existing instance", "Reading a file", "Inheritance only", "Reflection only"], 0, "Copy a configured object instead of building from scratch."],
  ],
  "oops-structural": [
    ["Adapter is used to:", ["Make incompatible interfaces work together", "Create one instance", "Notify observers", "Undo actions"], 0, "It wraps one interface to look like another."],
    ["Decorator adds behaviour by:", ["Editing the original class", "Wrapping an object with another of the same interface", "Subclassing everything", "Using globals"], 1, "Stack wrappers to add features at run time."],
    ["Facade provides:", ["A simple interface over a complex subsystem", "Many small interfaces", "Object pooling", "Lazy loading only"], 0, "One easy entry point hides many moving parts."],
    ["Proxy controls access to an object, for example to:", ["Lazy-load, cache or check permissions", "Sort lists", "Compile code", "Delete classes"], 0, "It stands in front of the real object."],
  ],
  "oops-behavioral": [
    ["Strategy lets you:", ["Swap algorithms at run time behind one interface", "Create one instance", "Wrap an object", "Copy an object"], 0, "Example: different payment or pricing strategies."],
    ["Observer is used when:", ["One object's change must notify many dependents", "You need one instance", "You must convert interfaces", "You build complex objects"], 0, "Publish/subscribe inside a program."],
    ["Command turns a request into:", ["An object, enabling queues, logs and undo", "A static method", "A global", "A thread"], 0, "Requests become things you can store and replay."],
    ["State pattern changes an object's behaviour by:", ["Swapping its internal state object", "Using many if-else everywhere", "Subclassing at run time", "Copying it"], 0, "Each state class handles behaviour for that state."],
  ],
  "oops-questions": [
    ["Which is NOT one of the four OOP pillars?", ["Encapsulation", "Polymorphism", "Compilation", "Inheritance"], 2, "The four are encapsulation, abstraction, inheritance and polymorphism."],
    ["'Program to an interface, not an implementation' improves:", ["Speed", "Flexibility and testability", "Memory use", "Compile time"], 1, "You can swap implementations, including test doubles."],
    ["Shallow copy vs deep copy: a shallow copy:", ["Copies nested objects too", "Copies references to nested objects", "Copies nothing", "Is always immutable"], 1, "Nested objects end up shared between the copies."],
    ["What does 'this' refer to inside an instance method?", ["The class", "The current object", "The parent class", "The first argument"], 1, "It's the object the method was called on."],
  ],

  // ---------------- OS ----------------
  "os-processes": [
    ["The key difference between a process and a thread:", ["Threads have separate memory spaces", "Threads of one process share its memory", "Processes are lighter", "A thread can hold many processes"], 1, "Threads share the address space; processes are isolated."],
    ["Which is NOT shared between threads of a process?", ["Heap", "Code", "Stack", "Open files"], 2, "Each thread has its own stack and registers."],
    ["A process waiting for I/O is in which state?", ["Running", "Ready", "Blocked / waiting", "Terminated"], 2, "It can't run until the I/O completes."],
    ["A zombie process is one that:", ["Uses 100% CPU", "Has finished but whose parent hasn't collected its exit status", "Has no threads", "Runs in kernel mode"], 1, "It stays in the process table until the parent calls wait()."],
  ],
  "os-scheduling": [
    ["Which algorithm can starve long jobs?", ["FCFS", "Round Robin", "Shortest Job First", "FIFO"], 2, "Short jobs keep jumping ahead."],
    ["Round Robin uses:", ["A fixed time slice per process", "Priority only", "Shortest burst first", "No pre-emption"], 0, "Each process runs for a quantum, then goes to the back of the queue."],
    ["The convoy effect is associated with:", ["FCFS", "Round Robin", "SRTF", "Multilevel queues"], 0, "Short jobs wait behind one long job."],
    ["Pre-emptive scheduling means the OS can:", ["Never stop a process", "Take the CPU from a running process", "Only schedule at boot", "Run one process at a time forever"], 1, "A timer interrupt lets the scheduler switch tasks."],
  ],
  "os-syscalls": [
    ["A system call is how a program:", ["Calls another function", "Requests a service from the kernel", "Allocates stack", "Loops"], 1, "Example: read, write, fork."],
    ["Why is a context switch costly?", ["It deletes memory", "Saving/restoring registers and cache/TLB effects", "It reboots the CPU", "It needs disk I/O always"], 1, "State must be saved and caches warm up again."],
    ["User mode vs kernel mode exists to:", ["Speed up code", "Protect the system from faulty programs", "Save power", "Allow multiple users"], 1, "Only the kernel can run privileged instructions."],
    ["fork() in Unix:", ["Creates a new thread", "Creates a child process, a copy of the parent", "Kills a process", "Opens a file"], 1, "Both continue from the same point with different return values."],
  ],
  "os-sync": [
    ["A race condition happens when:", ["Two threads access shared data and the result depends on timing", "A thread sleeps", "A loop runs forever", "Memory is full"], 0, "Unsynchronised reads and writes interleave unpredictably."],
    ["A mutex allows how many threads in the critical section?", ["Any number", "Exactly one", "Two", "Zero"], 1, "Mutual exclusion: one owner at a time."],
    ["A counting semaphore initialised to 3 lets:", ["1 thread in", "Up to 3 threads in at once", "No threads in", "Infinite threads"], 1, "Each wait decrements; blocks at zero."],
    ["Busy waiting means:", ["Sleeping until signalled", "Looping repeatedly to check a condition", "Waiting on I/O", "Being blocked by the kernel"], 1, "It burns CPU; spinlocks only suit very short waits."],
  ],
  "os-classic": [
    ["Producer-consumer with a bounded buffer typically uses:", ["One mutex only", "A mutex plus 'empty' and 'full' semaphores", "No synchronisation", "Only sleep()"], 1, "Counts track free and filled slots; the mutex protects the buffer."],
    ["The dining philosophers problem illustrates:", ["Deadlock and starvation", "Paging", "Caching", "Scheduling fairness only"], 0, "Each grabs one fork and waits for the other forever."],
    ["Readers-writers allows:", ["Many readers or one writer at a time", "Many writers at once", "One reader only", "Readers and writers together"], 0, "Reads don't conflict; writes need exclusive access."],
    ["A simple fix for dining philosophers is to:", ["Remove forks", "Impose an order on picking up forks", "Add more philosophers", "Let all pick at once"], 1, "Ordering resources breaks the circular wait."],
  ],
  "os-deadlocks": [
    ["Which is NOT a necessary condition for deadlock?", ["Mutual exclusion", "Hold and wait", "Pre-emption", "Circular wait"], 2, "The condition is NO pre-emption."],
    ["Banker's algorithm is used for deadlock:", ["Prevention", "Avoidance", "Detection", "Recovery"], 1, "It only grants requests that keep the system in a safe state."],
    ["Acquiring locks in a fixed global order prevents:", ["Starvation", "Circular wait", "Mutual exclusion", "Paging"], 1, "No cycle can form if everyone locks in the same order."],
    ["Livelock differs from deadlock because threads:", ["Are blocked", "Keep running but make no progress", "Have finished", "Use no CPU"], 1, "They keep reacting to each other without getting anywhere."],
  ],
  "os-memory": [
    ["Paging divides memory into:", ["Variable-size segments", "Fixed-size pages and frames", "One big block", "Stacks only"], 1, "Fixed sizes remove external fragmentation."],
    ["Internal fragmentation is:", ["Wasted space inside an allocated block", "Free space scattered between blocks", "A disk error", "A cache miss"], 0, "The last page is often only partly used."],
    ["The TLB is:", ["A disk cache", "A cache for page-table translations", "A scheduler queue", "A type of lock"], 1, "It avoids walking the page table on every access."],
    ["Segmentation divides memory by:", ["Fixed sizes", "Logical units like code, stack and heap", "CPU cores", "Files"], 1, "Segments match how programs are structured."],
  ],
  "os-virtual": [
    ["A page fault occurs when:", ["The page is not in physical memory", "The CPU overheats", "A file is missing", "A thread deadlocks"], 0, "The OS loads it from disk and retries."],
    ["Thrashing is:", ["Too little paging", "The system spending most time swapping pages", "A CPU fault", "A network issue"], 1, "Working sets don't fit in memory."],
    ["LRU page replacement evicts:", ["The newest page", "The least recently used page", "A random page", "The largest page"], 1, "Recent use predicts near-future use."],
    ["Belady's anomaly can occur with:", ["LRU", "Optimal", "FIFO", "Any stack algorithm"], 2, "With FIFO, more frames can cause more faults."],
  ],
  "os-files": [
    ["An inode stores:", ["The file name", "File metadata and block pointers", "Only the data", "The directory tree"], 1, "Names live in directories, which point to inodes."],
    ["A hard link is:", ["A shortcut file pointing to a path", "Another directory entry for the same inode", "A copy of the file", "A network link"], 1, "Deleting one name leaves the data until all links are gone."],
    ["DMA lets devices:", ["Transfer data to memory without the CPU copying each byte", "Run user code", "Schedule processes", "Encrypt files"], 0, "The CPU is free during large transfers."],
    ["Journaling file systems help with:", ["Faster CPUs", "Recovering consistency after a crash", "Bigger files", "Compression"], 1, "Changes are logged before being applied."],
  ],
  "os-concurrency": [
    ["A thread pool helps by:", ["Creating a thread per task", "Reusing a fixed set of threads for many tasks", "Removing locks", "Using processes"], 1, "Thread creation is expensive; reuse caps overhead."],
    ["Async I/O (event loop) is efficient because:", ["It uses more threads", "Threads aren't blocked while waiting on I/O", "It avoids the kernel", "It's single-core only"], 1, "One thread can juggle many waiting operations."],
    ["Concurrency vs parallelism:", ["Same thing", "Concurrency is dealing with many tasks; parallelism is running them at the same time", "Parallelism needs one core", "Concurrency needs many cores"], 1, "Concurrency is about structure, parallelism about execution."],
    ["An atomic operation:", ["Can be interrupted halfway", "Completes as one indivisible step", "Always uses a mutex", "Is slower than a lock always"], 1, "No other thread can see it half-done."],
  ],
  "os-questions": [
    ["What happens on a CPU when an interrupt arrives?", ["It's ignored", "Current state is saved and a handler runs", "The system reboots", "The process ends"], 1, "After the handler, execution resumes or the scheduler picks another task."],
    ["Starvation means a process:", ["Has finished", "Waits indefinitely because others keep getting priority", "Is a zombie", "Is deadlocked with itself"], 1, "Ageing (raising priority over time) is a common fix."],
    ["Copy-on-write after fork() means:", ["Memory is copied immediately", "Pages are shared until one side writes", "No memory is shared", "Files are copied"], 1, "Copies are made lazily, only for pages that change."],
    ["Spinlock vs mutex: a spinlock is best when:", ["Waits are long", "Critical sections are very short, on multi-core", "Single core only", "Doing I/O inside"], 1, "Spinning is cheaper than sleeping only for tiny waits."],
  ],

  // ---------------- DBMS ----------------
  "db-sql": [
    ["INNER JOIN returns:", ["All rows from both tables", "Only rows with a match in both tables", "Only left table rows", "Only unmatched rows"], 1, "Rows without a partner are dropped."],
    ["LEFT JOIN keeps:", ["Only matches", "All left rows, with NULLs where no match", "All right rows", "Nothing"], 1, "Unmatched left rows still appear."],
    ["WHERE vs HAVING:", ["Same thing", "WHERE filters rows before grouping; HAVING filters groups after", "HAVING runs first", "WHERE works only on aggregates"], 1, "Use HAVING for conditions on COUNT, SUM and so on."],
    ["DELETE vs TRUNCATE:", ["Identical", "DELETE can filter rows; TRUNCATE removes all rows, usually faster", "TRUNCATE can use WHERE", "DELETE drops the table"], 1, "TRUNCATE is bulk and minimally logged in most engines."],
  ],
  "db-sql-advanced": [
    ["To find the 2nd highest salary, a window function choice is:", ["SUM()", "DENSE_RANK()", "COUNT(*)", "AVG()"], 1, "DENSE_RANK handles ties cleanly."],
    ["Window functions differ from GROUP BY because they:", ["Collapse rows", "Keep every row while computing across a set", "Can't sort", "Only count"], 1, "Each row keeps its detail plus the computed value."],
    ["A correlated subquery:", ["Runs once", "References the outer query and runs per outer row", "Can't use WHERE", "Is always faster"], 1, "It depends on values from the current outer row."],
    ["COUNT(*) vs COUNT(column):", ["Same always", "COUNT(column) skips NULLs", "COUNT(*) skips NULLs", "Both skip NULLs"], 1, "COUNT(*) counts rows; COUNT(col) counts non-null values."],
  ],
  "db-er": [
    ["A primary key must be:", ["Nullable", "Unique and not null", "A string", "Repeated"], 1, "It identifies each row exactly once."],
    ["A foreign key enforces:", ["Uniqueness", "Referential integrity between tables", "Sorting", "Encryption"], 1, "It must match an existing key in the parent table."],
    ["A many-to-many relationship is usually stored using:", ["One column", "A junction table", "A view", "An index"], 1, "Two foreign keys in a link table."],
    ["A candidate key is:", ["Any column", "A minimal set of columns that could be the primary key", "A foreign key", "An index"], 1, "One candidate key is chosen as the primary key."],
  ],
  "db-normal": [
    ["1NF requires:", ["No partial dependencies", "Atomic values, no repeating groups", "No transitive dependencies", "Only one table"], 1, "Each cell holds a single value."],
    ["2NF removes:", ["Repeating groups", "Partial dependencies on part of a composite key", "All joins", "Transitive dependencies"], 1, "Non-key columns must depend on the whole key."],
    ["3NF removes:", ["Transitive dependencies between non-key columns", "Primary keys", "Atomic values", "Indexes"], 0, "Non-key columns depend only on the key."],
    ["Denormalisation is done to:", ["Reduce storage", "Speed up reads at the cost of redundancy", "Enforce constraints", "Remove keys"], 1, "Fewer joins, but updates must keep copies in sync."],
  ],
  "db-index": [
    ["Most relational indexes are implemented as:", ["Linked lists", "B-trees / B+ trees", "Stacks", "Arrays only"], 1, "Balanced trees give fast lookups and range scans."],
    ["A composite index on (a, b) helps queries filtering on:", ["b alone", "a, or a and b", "Neither", "Only ORDER BY b"], 1, "The leftmost-prefix rule."],
    ["The cost of adding many indexes:", ["Slower writes and more storage", "Slower reads", "None", "Fewer rows"], 0, "Every insert or update must maintain each index."],
    ["A clustered index:", ["Stores rows in index order", "Is always on a string column", "Can exist many times per table", "Is the same as a hash index"], 0, "The table data itself is ordered by it; only one per table."],
  ],
  "db-acid": [
    ["Atomicity means a transaction:", ["Runs fast", "Happens fully or not at all", "Is isolated", "Is durable"], 1, "Partial transactions are rolled back."],
    ["Durability guarantees:", ["Committed data survives crashes", "No locks", "Fast reads", "No duplicates"], 0, "Usually via a write-ahead log."],
    ["Consistency (ACID) means:", ["All replicas agree", "A transaction takes the database from one valid state to another", "Reads are fast", "No NULLs"], 1, "Constraints and rules hold before and after."],
    ["Write-ahead logging means:", ["Data is written before the log", "Changes are logged before being applied to data files", "No logging", "Logging after commit only"], 1, "After a crash, the log can redo or undo work."],
  ],
  "db-isolation": [
    ["A dirty read is reading:", ["Deleted data", "Uncommitted changes of another transaction", "Old backups", "Indexed data"], 1, "That data might be rolled back."],
    ["Which level prevents non-repeatable reads but may allow phantoms (in the SQL standard)?", ["Read uncommitted", "Read committed", "Repeatable read", "Serializable"], 2, "Phantoms are new rows matching a query; serializable stops them too."],
    ["MVCC lets readers:", ["Block writers", "See a consistent snapshot without blocking writers", "Skip transactions", "Ignore isolation"], 1, "Multiple versions of a row are kept."],
    ["The strictest isolation level is:", ["Read committed", "Serializable", "Repeatable read", "Read uncommitted"], 1, "Results match some serial order of transactions."],
  ],
  "db-optimize": [
    ["EXPLAIN shows:", ["The data", "The query execution plan", "The schema", "Locks"], 1, "Use it to see scans, index use and join order."],
    ["The N+1 query problem is:", ["One query returning N rows", "1 query for a list plus N queries for each item's details", "N indexes", "A deadlock"], 1, "Fix it with a join or a batched lookup."],
    ["A full table scan on a large table usually means:", ["A missing or unusable index", "A fast query", "A deadlock", "A corrupt table"], 0, "Check indexes and whether functions on columns block them."],
    ["Wrapping an indexed column in a function in WHERE often:", ["Uses the index better", "Prevents index use", "Has no effect", "Creates an index"], 1, "The engine can't seek on the transformed value."],
  ],
  "db-nosql": [
    ["A key-value store is best for:", ["Complex joins", "Fast lookups by a key", "Ad-hoc reporting", "Graph traversal"], 1, "Example: sessions and caches."],
    ["A document database stores:", ["Rows and columns only", "Semi-structured documents such as JSON", "Only numbers", "Graphs"], 1, "Flexible schema per document."],
    ["Eventual consistency means:", ["Data is never consistent", "Replicas converge if no new writes arrive", "Strong consistency", "No replication"], 1, "Reads may briefly be stale."],
    ["When is SQL usually better than NoSQL?", ["Simple key lookups at huge scale", "Complex relationships and transactions", "Unstructured logs", "Caching"], 1, "Joins, constraints and ACID transactions."],
  ],
  "db-scale": [
    ["Sharding means:", ["Copying the same data everywhere", "Splitting data across machines by a key", "Compressing data", "Adding indexes"], 1, "Each shard holds part of the data."],
    ["Read replicas mainly help:", ["Write throughput", "Read throughput", "Schema design", "Encryption"], 1, "Reads spread across copies; writes still go to the primary."],
    ["Replication lag can cause:", ["Faster writes", "Stale reads from replicas", "Data loss always", "Deadlocks"], 1, "A replica may not have the latest write yet."],
    ["A bad shard key can lead to:", ["Hot spots on one shard", "Better balance", "Less storage", "Fewer queries"], 0, "Example: sharding by date sends all new writes to one shard."],
  ],
  "db-design": [
    ["Designing a schema for an orders system, the order-to-product relationship is:", ["One-to-one", "Many-to-many via an order_items table", "One-to-many from product to order", "Not needed"], 1, "An order has many products; a product is in many orders."],
    ["Storing a price on order_items (not only on products) is done to:", ["Save space", "Keep the price at purchase time when product prices change", "Avoid keys", "Speed up writes"], 1, "Historical facts shouldn't change with the catalogue."],
    ["Soft delete means:", ["Removing rows", "Marking rows as deleted with a flag or timestamp", "Truncating", "Dropping a table"], 1, "Keeps history and allows undo; remember to filter queries."],
    ["Which belongs in its own table?", ["A user's age", "A user's many addresses", "A user's email", "A user's name"], 1, "A repeating group becomes a separate table."],
  ],

  // ---------------- CN ----------------
  "cn-models": [
    ["HTTP belongs to which OSI layer?", ["Transport", "Network", "Application", "Data link"], 2, "Layer 7."],
    ["IP works at the:", ["Network layer", "Transport layer", "Session layer", "Physical layer"], 0, "It routes packets between networks."],
    ["TCP and UDP belong to the:", ["Application layer", "Transport layer", "Network layer", "Link layer"], 1, "They move data between processes on hosts."],
    ["MAC addresses are used at the:", ["Data link layer", "Network layer", "Application layer", "Transport layer"], 0, "Layer 2, within a local network."],
  ],
  "cn-ip": [
    ["How many usable host addresses does a /24 subnet have?", ["256", "254", "255", "128"], 1, "Network and broadcast addresses are reserved."],
    ["NAT allows:", ["Many private hosts to share a public IP", "Faster routing", "Encryption", "DNS lookups"], 0, "The router rewrites addresses and ports."],
    ["Which is a private IPv4 range?", ["8.8.8.0/24", "192.168.0.0/16", "1.1.1.0/24", "100.0.0.0/8"], 1, "Also 10.0.0.0/8 and 172.16.0.0/12."],
    ["IPv6 addresses are:", ["32 bits", "64 bits", "128 bits", "256 bits"], 2, "Far larger space than IPv4's 32 bits."],
  ],
  "cn-tcp": [
    ["The TCP handshake is:", ["SYN, ACK", "SYN, SYN-ACK, ACK", "ACK, SYN", "HELLO, OK"], 1, "Three steps to agree on sequence numbers."],
    ["Why would a game or video call prefer UDP?", ["Guaranteed delivery", "Lower latency; old packets aren't worth re-sending", "Ordering", "Encryption"], 1, "Late data is useless, so retransmission just adds delay."],
    ["TCP flow control prevents:", ["The sender overwhelming the receiver", "Network congestion only", "Packet loss always", "DNS failures"], 0, "The receive window tells the sender how much it can send."],
    ["TIME_WAIT exists to:", ["Speed up connections", "Let delayed packets of an old connection die out", "Encrypt data", "Close faster"], 1, "It prevents old segments confusing a new connection."],
  ],
  "cn-dns": [
    ["DNS translates:", ["IP to MAC", "Domain names to IP addresses", "Ports to services", "HTTP to HTTPS"], 1, "It's the internet's phone book."],
    ["An A record maps a name to:", ["An IPv6 address", "An IPv4 address", "A mail server", "Another name"], 1, "AAAA is for IPv6."],
    ["A CNAME record:", ["Maps a name to another name", "Holds text", "Maps to a mail server", "Is a reverse lookup"], 0, "An alias pointing to a canonical name."],
    ["TTL on a DNS record controls:", ["Encryption", "How long resolvers may cache it", "Packet size", "Routing"], 1, "Lower TTL means faster changes but more lookups."],
  ],
  "cn-http": [
    ["Which HTTP method is idempotent?", ["POST", "PUT", "PATCH (always)", "None"], 1, "Repeating a PUT leaves the same result."],
    ["Status 404 means:", ["Server error", "Not found", "Unauthorised", "Redirect"], 1, "The resource doesn't exist at that URL."],
    ["HTTP/2's big improvement is:", ["Plain-text headers", "Multiplexing many requests on one connection", "No TLS", "UDP only"], 1, "Avoids HTTP-level head-of-line blocking."],
    ["HTTP/3 runs on:", ["TCP", "QUIC over UDP", "SCTP", "Raw IP"], 1, "QUIC avoids TCP's head-of-line blocking."],
  ],
  "cn-tls": [
    ["TLS provides:", ["Only compression", "Encryption, integrity and server authentication", "Routing", "Caching"], 1, "Certificates prove who the server is."],
    ["In the TLS handshake, asymmetric cryptography is mainly used to:", ["Encrypt all traffic", "Agree on a shared symmetric key securely", "Compress data", "Sign DNS"], 1, "Bulk data then uses fast symmetric encryption."],
    ["A certificate authority (CA):", ["Issues trusted certificates binding a domain to a public key", "Hosts websites", "Routes traffic", "Stores passwords"], 0, "Browsers trust a set of root CAs."],
    ["HSTS tells browsers to:", ["Use HTTP", "Always use HTTPS for the site", "Cache forever", "Skip certificates"], 1, "Prevents downgrade attacks."],
  ],
  "cn-apis": [
    ["REST APIs are typically:", ["Stateful", "Stateless, resource-oriented over HTTP", "Binary only", "UDP-based"], 1, "Each request carries all it needs."],
    ["WebSockets are best for:", ["One-off requests", "Two-way real-time messages", "File storage", "DNS"], 1, "A persistent full-duplex connection."],
    ["gRPC uses:", ["XML over HTTP/1", "Protocol Buffers over HTTP/2", "JSON over UDP", "SOAP"], 1, "Compact binary messages and streaming."],
    ["Long polling means:", ["The client polls every second", "The server holds the request until there's data", "A WebSocket", "Server push via UDP"], 1, "Fewer empty responses than plain polling."],
  ],
  "cn-lb": [
    ["A layer 4 load balancer routes based on:", ["URL path", "IP and port", "Cookies", "HTTP headers"], 1, "It doesn't inspect the HTTP content."],
    ["A layer 7 load balancer can route by:", ["Only IP", "URL path, headers or cookies", "MAC address", "Nothing"], 1, "It understands HTTP."],
    ["Sticky sessions send:", ["Requests to random servers", "A user's requests to the same server", "All traffic to one server", "Traffic to the cache"], 1, "Useful with server-side session state, but hurts balance."],
    ["A reverse proxy sits:", ["In front of clients", "In front of servers, accepting client requests", "Inside the database", "On the client's PC"], 1, "It can terminate TLS, cache and balance load."],
  ],
  "cn-cdn": [
    ["A CDN mainly reduces:", ["Server CPU only", "Latency, by serving content from nearby edge servers", "DNS lookups", "Database size"], 1, "Users fetch from a closer location."],
    ["Cache-Control: max-age=3600 means:", ["Never cache", "The response may be cached for an hour", "Cache for 3600 days", "Only the CDN may cache"], 1, "Seconds, here one hour."],
    ["Cache invalidation on a CDN is needed when:", ["Content changes before its TTL expires", "Traffic grows", "DNS changes", "Never"], 0, "Or version the file names instead."],
    ["Which content benefits most from a CDN?", ["Per-user bank balances", "Static assets like images, JS and CSS", "Database writes", "Login requests"], 1, "Same bytes for everyone."],
  ],
  "cn-url": [
    ["First step when you open a URL (nothing cached):", ["TCP handshake", "DNS lookup for the domain", "TLS handshake", "Render HTML"], 1, "You need the IP before connecting."],
    ["Correct order for HTTPS:", ["TLS, DNS, TCP", "DNS, TCP, TLS, HTTP request", "TCP, DNS, HTTP", "HTTP, DNS, TCP"], 1, "Resolve, connect, secure, then request."],
    ["The browser parses HTML into a:", ["Database", "DOM tree", "Packet", "Certificate"], 1, "Then combines it with CSS to render."],
    ["Keep-alive connections help by:", ["Reusing a TCP connection for multiple requests", "Encrypting data", "Caching DNS", "Compressing images"], 0, "Saves a handshake per request."],
  ],
};

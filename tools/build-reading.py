# Builds hub-src/src/data/reading.ts: links (never copied content) into five GitHub repos, mapped to catalog topics.
# Every link was checked to exist (sections by their GitHub anchors, files by HTTP 200) on 6 Oct 2026.
import json, os, re

def gh_anchor(heading):  # GitHub's heading-anchor rule
    return re.sub(r"[^a-z0-9 _-]", "", heading.lower()).replace(" ", "-")

TIH = "https://www.techinterviewhandbook.org/algorithms/{}/"
SDP = "https://github.com/donnemartin/system-design-primer"
SDP_SEC = lambda h: f"{SDP}#{gh_anchor(h)}"
SDP_SOL = lambda p: f"{SDP}/blob/master/solutions/{p}"
BE = "https://github.com/arialdomartini/Back-End-Developer-Interview-Questions#{}"
CSF = "https://github.com/Krishnagangwal/CS-Fundamentals/tree/main/{}"

items = []
def add(kind, title, source, url, topics): items.append({"kind": kind, "title": title, "source": source, "url": url, "topics": topics})

# Tech Interview Handbook: one cheatsheet per DSA pattern
for slug, title, topics in [
    ("array", "Array cheatsheet", ["dsa-arrays", "dsa-two-pointers"]), ("hash-table", "Hash table cheatsheet", ["dsa-arrays"]),
    ("string", "String cheatsheet (sliding window)", ["dsa-sliding-window"]), ("stack", "Stack cheatsheet", ["dsa-stack"]),
    ("queue", "Queue cheatsheet", ["dsa-stack"]), ("linked-list", "Linked list cheatsheet", ["dsa-linked-lists"]),
    ("sorting-searching", "Sorting and searching cheatsheet", ["dsa-binary-search"]), ("tree", "Tree cheatsheet", ["dsa-trees"]),
    ("heap", "Heap cheatsheet", ["dsa-heaps"]), ("recursion", "Recursion cheatsheet", ["dsa-backtracking"]),
    ("graph", "Graph cheatsheet", ["dsa-graphs"]), ("matrix", "Matrix cheatsheet", ["dsa-graphs", "dsa-arrays"]),
    ("interval", "Interval cheatsheet", ["dsa-intervals"]), ("trie", "Trie cheatsheet", ["dsa-tries"]),
    ("dynamic-programming", "Dynamic programming cheatsheet", ["dsa-dp"]),
]: add("cheatsheet", title, "Tech Interview Handbook", TIH.format(slug), topics)

# System Design Primer: concept sections and worked solutions
for h, topics in [
    ("Performance vs scalability", ["sd-scale"]), ("Back-of-the-envelope calculations", ["sd-estimates"]),
    ("Latency numbers every programmer should know", ["sd-estimates"]), ("Load balancer", ["sd-lb", "cn-lb"]),
    ("Reverse proxy (web server)", ["cn-lb"]), ("Cache", ["sd-cache"]), ("Content delivery network", ["cn-cdn"]),
    ("Database", ["sd-databases"]), ("Sharding", ["db-scale", "sd-databases"]), ("NoSQL", ["db-nosql"]), ("SQL or NoSQL", ["db-nosql"]),
    ("CAP theorem", ["sd-cap"]), ("Consistency patterns", ["sd-cap"]), ("Availability patterns", ["sd-reliability"]),
    ("Asynchronism", ["sd-queues"]), ("Application layer", ["sd-micro"]), ("Domain name system", ["cn-dns"]),
    ("Hypertext transfer protocol (HTTP)", ["cn-http"]), ("Transmission control protocol (TCP)", ["cn-tcp"]),
    ("User datagram protocol (UDP)", ["cn-tcp"]), ("Representational state transfer (REST)", ["cn-apis"]),
    ("Remote procedure call (RPC)", ["cn-apis"]), ("How to approach a system design interview question", ["sd-mocks"]),
]: add("guide", h, "System Design Primer", SDP_SEC(h), topics)
for path, title, topics in [
    ("system_design/pastebin/README.md", "Solution: Pastebin / Bit.ly", ["sd-url"]),
    ("system_design/twitter/README.md", "Solution: Twitter timeline and search", ["sd-feed"]),
    ("system_design/scaling_aws/README.md", "Solution: scaling to millions of users", ["sd-scale", "sd-mocks"]),
    ("object_oriented_design/parking_lot/parking_lot.ipynb", "Solution: parking lot (OOD)", ["lld-parking"]),
    ("object_oriented_design/lru_cache/lru_cache.ipynb", "Solution: LRU cache (OOD)", ["lld-cache"]),
    ("object_oriented_design/call_center/call_center.ipynb", "Solution: call center (OOD)", ["lld-mocks"]),
]: add("solution", title, "System Design Primer", SDP_SOL(path), topics)

# Back-End Developer Interview Questions: open questions to practise answering aloud
for anchor, title, topics in [
    ("patterns", "Design pattern questions", ["oops-creational", "oops-structural", "oops-behavioral", "lld-patterns"]),
    ("design", "Code design questions", ["oops-solid", "oops-coupling"]), ("databases", "Database questions", ["db-acid", "db-isolation", "db-index", "db-optimize"]),
    ("nosql", "NoSQL questions", ["db-nosql", "sd-cap"]), ("concurrency", "Concurrency questions", ["os-sync", "os-deadlocks", "os-concurrency", "lld-concurrency"]),
    ("distributed", "Distributed systems questions", ["sd-reliability", "sd-cap"]), ("architecture", "Architecture questions", ["sd-cache", "sd-queues"]),
    ("soa", "Microservices questions", ["sd-micro"]), ("web", "Web development questions", ["cn-http", "cn-apis"]),
    ("security", "Security questions", ["cn-tls"]), ("open", "Open questions", ["sd-mocks"]),
]: add("questions", title, "Back-End Developer Interview Questions", BE.format(anchor), topics)

# Subject-level: revision notes (folder links only), curriculum, interview process
subjects = [
    {"subject": "os", "title": "OS notes and interview questions", "source": "CS-Fundamentals", "url": CSF.format("Operating-System")},
    {"subject": "dbms", "title": "DBMS and SQL notes, interview questions", "source": "CS-Fundamentals", "url": CSF.format("DBMS-and-SQL")},
    {"subject": "cn", "title": "Networking notes and interview questions", "source": "CS-Fundamentals", "url": CSF.format("Computer-Network")},
    {"subject": "oops", "title": "OOP interview questions", "source": "CS-Fundamentals", "url": CSF.format("OOPs")},
    {"subject": "sd", "title": "System design cheatsheet and questions", "source": "CS-Fundamentals", "url": CSF.format("System-Design")},
    {"subject": "dsa", "title": "Coding interview study cheatsheet", "source": "Tech Interview Handbook", "url": "https://www.techinterviewhandbook.org/coding-interview-cheatsheet/"},
    {"subject": "dsa", "title": "Full CS study plan (topic order reference)", "source": "Coding Interview University", "url": "https://github.com/jwasham/coding-interview-university"},
    {"subject": "sd", "title": "System design study guide", "source": "System Design Primer", "url": SDP_SEC("Study guide")},
]
credits = [
    {"source": "Tech Interview Handbook", "url": "https://github.com/yangshun/tech-interview-handbook", "license": "MIT"},
    {"source": "Coding Interview University", "url": "https://github.com/jwasham/coding-interview-university", "license": "CC BY-SA 4.0"},
    {"source": "System Design Primer", "url": SDP, "license": "CC BY 4.0"},
    {"source": "CS-Fundamentals", "url": "https://github.com/Krishnagangwal/CS-Fundamentals", "license": "No license stated: linked to, never copied"},
    {"source": "Back-End Developer Interview Questions", "url": "https://github.com/arialdomartini/Back-End-Developer-Interview-Questions", "license": "GPL-2.0: linked to, never copied"},
]
out = "// GENERATED by tools/build-reading.py. Links only: no content from these repositories is copied into the app.\n"
out += "export interface Reading { kind: 'cheatsheet' | 'guide' | 'solution' | 'questions'; title: string; source: string; url: string; topics: string[] }\n"
out += f"export const READING: Reading[] = {json.dumps(items)};\n"
out += f"export const SUBJECT_READING: {{ subject: string; title: string; source: string; url: string }}[] = {json.dumps(subjects)};\n"
out += f"export const CREDITS: {{ source: string; url: string; license: string }}[] = {json.dumps(credits)};\n"
open(os.path.join(os.path.dirname(__file__), "..", "hub-src", "src", "data", "reading.ts"), "w").write(out)
print(len(items), "topic links,", len(subjects), "subject links")

# Builds hub-src/src/data/videos.ts from the YouTube CSVs in content/youtube/.
# Mapping from video number to catalog topic ids is written by hand below (first id = the topic it teaches best).
import csv, json, re, os
D = os.path.join(os.path.dirname(__file__), "..", "content", "youtube")
def rows(name): return list(csv.DictReader(open(os.path.join(D, name), encoding="utf-8-sig")))
def mins(t):
    h, m, s = (int(x) for x in t.split(":")); return round(h * 60 + m + s / 60)
def clean(title): return re.split(r"\s+\|\s+(C\+\+|Java|Python|Real World Example|Real-World|Brute)", title)[0].strip()

STRIVER = {1:"dsa-arrays",2:"dsa-arrays",3:"dsa-two-pointers",4:"dsa-arrays",5:"dsa-arrays",6:"dsa-two-pointers",7:"dsa-arrays",8:"dsa-arrays",9:"dsa-arrays",10:"dsa-arrays",
  11:"dsa-arrays",12:"dsa-sliding-window",13:"dsa-arrays",14:"dsa-two-pointers",15:"dsa-arrays",16:"dsa-arrays",17:"dsa-arrays",18:"dsa-arrays",19:"dsa-two-pointers",20:"dsa-arrays",
  21:"dsa-arrays",22:"dsa-arrays",23:"dsa-arrays",24:"dsa-arrays",25:"dsa-arrays",26:"dsa-arrays",27:"dsa-arrays",28:"dsa-arrays",29:"dsa-two-pointers",30:"dsa-two-pointers",
  31:"dsa-arrays",32:"dsa-arrays",33:"dsa-intervals",34:"dsa-two-pointers",35:"dsa-arrays",36:"dsa-arrays",37:"dsa-arrays",38:"dsa-arrays",
  39:"dsa-binary-search",40:"dsa-binary-search",41:"dsa-binary-search",42:"dsa-binary-search",43:"dsa-binary-search",44:"dsa-binary-search",45:"dsa-binary-search",
  46:"dsa-binary-search",47:"dsa-binary-search",48:"dsa-binary-search",49:"dsa-binary-search",50:"dsa-binary-search"}
CODER_ARMY = {1:["lld-requirements"],2:["oops-classes","oops-encapsulation","lld-requirements"],3:["oops-inheritance","oops-polymorphism"],4:["lld-uml"],5:["oops-solid","lld-patterns"],6:["oops-solid"],
  7:["lld-requirements","lld-mocks"],8:["oops-behavioral","lld-patterns"],9:["oops-creational","lld-patterns"],10:["oops-creational"],11:["lld-mocks"],12:["oops-behavioral","lld-patterns"],
  13:["oops-structural"],14:["lld-mocks"],15:["oops-behavioral"],16:["oops-structural"],17:["oops-structural"],18:["lld-mocks"],19:["oops-structural"],20:["oops-behavioral"],
  21:["oops-structural"],22:["oops-behavioral"],23:["lld-mocks"],24:["lld-mocks"],25:["oops-structural"],26:["lld-mocks"],27:["lld-mocks"],28:["oops-creational"],
  29:["oops-behavioral"],30:["oops-structural"],31:["lld-splitwise"],32:["oops-behavioral"],33:["lld-games"],34:["lld-games"],35:["oops-behavioral"],36:["oops-creational"],
  37:["lld-games"],38:["oops-behavioral"],39:["oops-behavioral"],40:["oops-behavioral"]}
GAURAV = {2:["sd-scale"],3:["sd-scale"],4:["sd-lb","cn-lb"],5:["sd-hashing"],6:["sd-queues"],7:["sd-micro"],8:["sd-databases"],9:["sd-mocks"],10:["sd-mocks"],11:["sd-chat"],
  12:["sd-cache"],13:["cn-apis","sd-ratelimit"],14:["sd-estimates"],15:["sd-reliability"],16:["db-nosql","sd-databases"],17:["sd-cap","sd-databases"],18:["sd-queues"],
  19:["sd-reliability"],20:["sd-queues","sd-micro"],21:["sd-feed"],22:["sd-reliability"],23:["sd-mocks"]}

videos = []
def add(src, channel, playlist, mapping, single):
    for r in rows(src):
        n = int(r["Order"]); topics = mapping.get(n)
        if not topics: continue
        topics = [topics] if single else topics
        videos.append({"id": f"{channel[:3].lower()}-{n}", "title": clean(r["Video title"]), "channel": channel, "minutes": mins(r["Length"]),
                       "playlist": playlist, "index": n, "topics": topics})
add("01_DSA_Striver_A2Z__videos_1-50_of_315.csv", "take U forward (Striver)", "https://www.youtube.com/playlist?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz", STRIVER, True)
add("03_LLD_Coder_Army__40_videos.csv", "Coder Army", "https://www.youtube.com/playlist?list=PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT", CODER_ARMY, False)
add("04_System_Design_Gaurav_Sen__23_video_snapshot.csv", "Gaurav Sen", "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX", GAURAV, False)

courses = [
  {"subject": "dsa", "title": "Striver A2Z DSA course", "channel": "take U forward (Striver)", "length": "315 videos", "url": "https://www.youtube.com/playlist?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz", "search": False},
  {"subject": "oops", "title": "OOPs full course", "channel": "Kunal Kushwaha", "length": "about 7 h 18 min", "url": "https://www.youtube.com/playlist?list=PL9gnSGHSqcno1G3XjUbwzXHL8_EttOuKk", "search": False},
  {"subject": "dbms", "title": "DBMS placement playlist", "channel": "Love Babbar & Lakshya", "length": "about 8 h 48 min", "url": "https://www.youtube.com/results?search_query=Love+Babbar+Lakshya+DBMS+playlist", "search": True},
  {"subject": "cn", "title": "Computer Networks, complete playlist", "channel": "Gate Smashers", "length": "106 videos, about 19 h", "url": "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_", "search": False},
  {"subject": "lld", "title": "System Design (LLD) full course", "channel": "Coder Army", "length": "about 34 h", "url": "https://www.youtube.com/playlist?list=PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT", "search": False},
  {"subject": "sd", "title": "System Design playlist", "channel": "Gaurav Sen", "length": "26 videos", "url": "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX", "search": False},
]
out = "// GENERATED by tools/build-videos.py from content/youtube/*.csv. Do not edit by hand.\n"
out += "export interface Video { id: string; title: string; channel: string; minutes: number; playlist: string; index: number; topics: string[] }\n"
out += "export interface Course { subject: string; title: string; channel: string; length: string; url: string; search: boolean }\n"
out += f"export const VIDEOS: Video[] = {json.dumps(videos, ensure_ascii=False)};\n"
out += f"export const COURSES: Course[] = {json.dumps(courses, ensure_ascii=False)};\n"
os.makedirs(os.path.join(os.path.dirname(__file__), "..", "hub-src", "src", "data"), exist_ok=True)
open(os.path.join(os.path.dirname(__file__), "..", "hub-src", "src", "data", "videos.ts"), "w").write(out)
from collections import Counter
c = Counter(t for v in videos for t in v["topics"])
print(len(videos), "videos mapped;", len(c), "topics covered")
print(sorted(c.items()))

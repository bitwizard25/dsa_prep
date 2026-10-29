# Maps the Obsidian Gold palette to Midnight calm in both stylesheets (run once; idempotent).
import re, sys
MAP = [
  ("#0D0D0D", "#151A21"), ("#0d0d0d", "#151A21"), ("#111;", "#171C24;"), ("#111 ", "#171C24 "), ("#0F0F0F", "#131820"),
  ("#161616", "#1C232C"), ("#1E1E1E", "#232B36"), ("#262626", "#2A323D"), ("#2E2A22", "#2A323D"),
  ("#15130f", "#171C24"), ("#231d0e", "#1B222B"),
  ("#D4AF37", "#8FC1A9"), ("#E2C35A", "#A6D0BC"), ("#F0D78C", "#BFE0CF"), ("#9C7C24", "#6E9C86"), ("#B8932E", "#7FAF98"),
  ("#F2EEE3", "#E4E8EE"), ("#9A958A", "#8C97A6"),
  ("#C7774A", "#D9A86C"), ("#C2414B", "#D98B8B"),
]
RGBA = [(r"rgba\(\s*212,\s*175,\s*55,", "rgba(143,193,169,"), (r"rgba\(\s*13,\s*13,\s*13,", "rgba(21,26,33,"),
        (r"rgba\(\s*22,\s*22,\s*22,", "rgba(28,35,44,"), (r"rgba\(\s*18,\s*18,\s*18,", "rgba(24,30,38,"),
        (r"rgba\(\s*38,\s*38,\s*38,", "rgba(42,50,61,"), (r"rgba\(\s*5,\s*5,\s*5,", "rgba(10,13,18,"),
        (r"rgba\(\s*199,\s*119,\s*74,", "rgba(217,168,108,"), (r"rgba\(\s*194,\s*65,\s*75,", "rgba(217,139,139,")]
for path in sys.argv[1:]:
    s = open(path).read(); n0 = s
    for a, b in MAP: s = s.replace(a, b)
    for a, b in RGBA: s = re.sub(a, b, s)
    open(path, "w").write(s)
    print(path, "changed" if s != n0 else "unchanged", "| gold left:", len(re.findall(r"D4AF37|212,\s*175,\s*55", s, re.I)))

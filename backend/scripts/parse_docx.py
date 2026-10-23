import json, re, sys
from docx import Document
d = Document(sys.argv[1])
clean = lambda s: re.sub(r'\s+', ' ', s.replace('*','')).strip()
meta = [("Performing Arts","Music"),("Performing Arts","Dance"),("Performing Arts","Drama"),
 ("Literary Arts",None),("Fine Arts",None),("Tech Arts",None),("Sports",None),("Gaming",None),
 ("Fun & Games",None),("Informal Events",None)]
events, flagship = [], set()
for i, t in enumerate(d.tables):
    rows = [[clean(c.text) for c in r.cells] for r in t.rows][1:]
    if i < 10:
        for r in rows:
            events.append(dict(no=int(r[0]), name=r[1], category=meta[i][0], subcategory=meta[i][1],
              description=r[2], team_size=r[3], duration=r[4], format=r[5], components=r[6], mumbai_angle=r[7]))
    elif i == 10:
        flagship = {clean(r[0]).lower() for r in rows}
    else:
        n = 51
        for r in rows:
            events.append(dict(no=n, name=r[1], category="Public Relations", subcategory=None,
              description=r[2], team_size=r[3], duration=r[4], format=r[5], components=r[6], mumbai_angle=r[7])); n += 1
for e in events:
    norm=lambda s:s.lower().replace("–","-")
    e["flagship"] = any(norm(e["name"]).startswith(norm(f)) for f in flagship) or "flagship" in e["format"].lower()
    e["format"] = re.sub(r'\s*\(?Flagship event\)?', '', e["format"]).strip(' /') or e["format"]
json.dump(events, open("data/events.json","w"), indent=1, ensure_ascii=False)
print(len(events), sum(e["flagship"] for e in events), [e["name"] for e in events if e["flagship"]])

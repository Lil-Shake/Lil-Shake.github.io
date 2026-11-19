#!/usr/bin/env python3
"""Turn an export of the private "音乐索引" (music index) into data for the /music/ page.

The index lives in a private claude.ai artifact, so nothing here can fetch it over the network.
A Claude session exports it first, then runs this script:

    1. Export the artifact's `bands` collection to   <export>/bands/<id>.json
    2. Save every referenced image (band photo, release cover) to   <assets>/<asset id>.<ext>
       Only ids this script reports as MISSING need to be downloaded; the rest are already here.
    3. python3 scripts/music_sync.py --export <export> --assets <assets>

Writes:
    _data/music.json              `bands` (everything the page prints) and `index` (the slim copy
                                  the interactive chart, list and panel read)
    images/music/<asset id>.webp  self-hosted photos and covers (files no longer referenced are removed)

Images are converted with Pillow when it is installed, otherwise with the `cwebp` command.
"""
import argparse
import datetime
import glob
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "_data", "music.json")
IMAGE_DIR = os.path.join(ROOT, "images", "music")
IMAGE_URL = "/images/music/"
COVER_MAX_SIDE = 400
PHOTO_MAX_SIDE = 1200
WEBP_QUALITY = 82
MIN_LINK_SCORE = 2
TIMELINE_PAD_YEARS = 2
ASSET_ID_RE = re.compile(r"^[0-9a-f]{32}$")

# Every dimension two bands can share: (key, label, weight, holds one value, sentence).
DIMS = [
    ("country", "地区", 1, True, "同样来自{}"),
    ("city", "城市", 3, True, "同在{}"),
    ("genres", "类型", 2, False, "都是 {}"),
    ("scenes", "场景与运动", 3, False, "同属 {}"),
    ("labels", "厂牌", 2, False, "同在厂牌 {}"),
    ("members", "成员", 4, False, "共同成员 {}"),
    ("producers", "制作人", 2, False, "同一位制作人 {}"),
    ("influences", "受谁影响", 1.5, False, "都受 {} 影响"),
    ("sound", "声音", 1, False, "声音上都有 {}"),
    ("moods", "气质", 1, False, "气质都偏 {}"),
    ("themes", "主题与文化关联", 1.5, False, "都关联到 {}"),
    ("languages", "语言", 0.5, False, "都用{}演唱"),
    ("source", "怎么认识的", 1, True, "都是从{}认识的"),
]
HIDDEN_DIMS = {"country", "city"}  # already in the "where" line under the name
FACET_PREFIX = "x:"
STATUS_LABELS = {"like": "喜欢", "explore": "想了解"}
STRIP_WIDTH = 640
STRIP_PAD = 14
STRIP_BASELINE = 37
STRIP_STACK_STEP = 10
FACET_WEIGHT = 1
PERSON_LINK_SCORE = 4
LEAD_LINK_SCORE = 4
CITE_SCORE = 4
RELATED_SCORE = 4
SHARED_LEAD_SCORE = 2
NEAR_YEARS = 3


def text(value):
    return value.strip() if isinstance(value, str) else ""


def year(value):
    try:
        n = round(float(value))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def items(value):
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        return [x.strip() for x in re.split(r"[,，、]", value) if x.strip()]
    return []


def dicts(value):
    return [x for x in value if isinstance(x, dict)] if isinstance(value, list) else []


def asset(value):
    value = text(value)
    return value if ASSET_ID_RE.match(value) else ""


def normalize(band_id, raw):
    """Read one exported document defensively: it is hand-edited data."""
    values = {key: ([text(raw.get(key))] if text(raw.get(key)) else []) if one else items(raw.get(key))
              for key, _, _, one, _ in DIMS}
    facets = {}
    if isinstance(raw.get("facets"), dict):
        for name, entries in raw["facets"].items():
            if name.strip() and items(entries):
                facets[name.strip()] = items(entries)
    releases = [{
        "title": str(r["title"]).strip(), "year": year(r.get("year")), "kind": text(r.get("kind")),
        "note": text(r.get("note")), "heard": r.get("heard") is True, "fav": r.get("fav") is True,
        "cover": asset(r.get("cover")), "tracks": items(r.get("tracks")),
    } for r in dicts(raw.get("releases") or raw.get("albums")) if r.get("title")]
    stories = [{
        "title": text(s.get("title")), "text": text(s.get("text")), "year": year(s.get("year")),
        "source": text(s.get("source")), "person": text(s.get("person")), "release": text(s.get("release")),
        "url": text(s.get("url")) if text(s.get("url")).startswith(("http://", "https://")) else "",
    } for s in dicts(raw.get("stories")) if text(s.get("text"))]
    return {
        "id": band_id, "name": text(raw.get("name")) or band_id, "aliases": items(raw.get("aliases")),
        "formed": year(raw.get("formedYear")), "ended": year(raw.get("endYear")),
        "status": "like" if raw.get("status") == "like" else "explore",
        "note": text(raw.get("note")), "added": text(raw.get("addedAt"))[:10],
        "related": items(raw.get("related")), "values": values, "facets": facets,
        "photo": asset(raw.get("photo")), "photo_credit": text(raw.get("photoCredit")),
        "releases": sorted(releases, key=lambda r: r["year"] or 9999),
        "stories": sorted(stories, key=lambda s: s["year"] or 9999),
        "people": [{"name": text(p.get("name")), "role": text(p.get("role")), "years": text(p.get("years")),
                    "note": text(p.get("note")), "projects": items(p.get("projects"))}
                   for p in dicts(raw.get("people")) if text(p.get("name"))],
        "leads": [{"name": text(l.get("name")), "why": text(l.get("why"))}
                  for l in dicts(raw.get("leads")) if text(l.get("name"))],
        "shows": sorted(({"date": text(x.get("date")), "city": text(x.get("city")),
                          "venue": text(x.get("venue")), "note": text(x.get("note"))}
                         for x in dicts(raw.get("shows")) if text(x.get("date"))), key=lambda x: x["date"]),
        "shows_checked": text(raw.get("showsChecked")), "shows_source": text(raw.get("showsSource")),
    }


def names_of(band):
    return {band["name"].lower(), band["id"]} | {a.lower() for a in band["aliases"]}


def shared_dimensions(a, b):
    score, reasons = 0, []
    same_city = bool(a["values"]["city"]) and [c.lower() for c in a["values"]["city"]] == [c.lower() for c in b["values"]["city"]]
    for key, _, weight, _, sentence in DIMS:
        if key == "country" and same_city:
            continue
        theirs = {v.lower() for v in b["values"][key]}
        shared = [v for v in a["values"][key] if v.lower() in theirs]
        if shared:
            score += weight * len(shared)
            reasons.append(sentence.format("、".join(shared)))
    for name, entries in a["facets"].items():
        theirs = {v.lower() for v in b["facets"].get(name, [])}
        shared = [v for v in entries if v.lower() in theirs]
        if shared:
            score += FACET_WEIGHT * len(shared)
            reasons.append(name + "相同：" + "、".join(shared))
    return score, reasons


def outside_names(band):
    return [l["name"] for l in band["leads"]] + band["values"]["influences"]


def relation(a, b):
    """Score how strongly band a is tied to band b, with the reasons in reading order."""
    score, reasons = shared_dimensions(a, b)
    if a["formed"] and b["formed"] and abs(a["formed"] - b["formed"]) <= NEAR_YEARS:
        gap = abs(a["formed"] - b["formed"])
        score += 1
        reasons.append("同一年成立" if gap == 0 else "成立时间只差 %d 年" % gap)

    def via_person(x, y):
        return next((p for p in x["people"] if any(r.lower() in names_of(y) for r in p["projects"])), None)

    def via_lead(x, y):
        return next((l for l in x["leads"] if l["name"].lower() in names_of(y)), None)

    def cites(x, y):
        return any(r.lower() in names_of(y) for r in x["values"]["influences"])

    person = via_person(a, b) or via_person(b, a)
    if person:
        score += PERSON_LINK_SCORE
        reasons.insert(0, person["name"] + " 把两边连在一起")
    for lead in (via_lead(a, b), via_lead(b, a)):
        if lead:
            score += LEAD_LINK_SCORE
            if lead["why"]:
                reasons.insert(0, lead["why"])
    both_cite = {v.lower() for v in a["values"]["influences"]} & {v.lower() for v in b["values"]["influences"]}
    theirs = {n.lower() for n in outside_names(b)}
    shared_out = []
    for name in outside_names(a):
        key = name.lower()
        if key in theirs and key not in both_cite and key not in {n.lower() for n in shared_out}:
            shared_out.append(name)
    if shared_out:
        score += SHARED_LEAD_SCORE * len(shared_out)
        reasons.append("都通向 " + "、".join(shared_out))
    if cites(a, b):
        score += CITE_SCORE
        reasons.insert(0, "受 " + b["name"] + " 影响")
    if cites(b, a):
        score += CITE_SCORE
        reasons.insert(0, "影响了 " + b["name"])
    if any(r.lower() in names_of(b) for r in a["related"]) or any(r.lower() in names_of(a) for r in b["related"]):
        score += RELATED_SCORE
        reasons.append("标记过的关联")
    return score, reasons


def connections(band, bands):
    links = []
    for other in bands:
        if other["id"] == band["id"]:
            continue
        score, reasons = relation(band, other)
        if score >= MIN_LINK_SCORE:
            links.append({"id": other["id"], "name": other["name"], "score": score, "reasons": reasons})
    return sorted(links, key=lambda l: -l["score"])


def outside_leads(band, bands):
    """Names worth following that are not in the index yet."""
    known = set().union(*(names_of(b) for b in bands))
    leads, seen = [], set()
    for lead in band["leads"] + [{"name": n, "why": "受其影响"} for n in band["values"]["influences"]]:
        key = lead["name"].lower()
        if key not in seen and key not in known:
            seen.add(key)
            leads.append(lead)
    return leads


def convert_image(source, target, max_side):
    try:
        from PIL import Image
    except ImportError:
        Image = None
    if Image:
        with Image.open(source) as im:
            im = im.convert("RGB")
            im.thumbnail((max_side, max_side))
            im.save(target, "WEBP", quality=WEBP_QUALITY)
            return im.size
    if not shutil.which("cwebp"):
        raise RuntimeError("need Pillow (pip install pillow) or the cwebp command to convert images")
    probe = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", source], capture_output=True, text=True)
    dims = [int(n) for n in re.findall(r"pixel(?:Width|Height): (\d+)", probe.stdout)]
    resize = []
    if len(dims) == 2 and max(dims) > max_side:
        resize = ["-resize", str(max_side), "0"] if dims[0] >= dims[1] else ["-resize", "0", str(max_side)]
    done = subprocess.run(["cwebp", "-quiet", "-q", str(WEBP_QUALITY), *resize, source, "-o", target],
                          capture_output=True, text=True)
    if done.returncode != 0:
        raise RuntimeError("cwebp failed for %s: %s" % (source, done.stderr.strip()))
    return image_size(target)


def image_size(path):
    """Width and height of a WebP file, read from its header."""
    with open(path, "rb") as f:
        head = f.read(30)
    if head[12:16] == b"VP8X":
        return (1 + int.from_bytes(head[24:27], "little"), 1 + int.from_bytes(head[27:30], "little"))
    if head[12:16] == b"VP8 ":
        return (int.from_bytes(head[26:28], "little") & 0x3FFF, int.from_bytes(head[28:30], "little") & 0x3FFF)
    if head[12:16] == b"VP8L":
        bits = int.from_bytes(head[21:25], "little")
        return ((bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1)
    return (0, 0)


def sync_images(wanted, assets_dir):
    """Make sure every wanted asset has a .webp; return {asset id: (width, height)} and the missing ids."""
    os.makedirs(IMAGE_DIR, exist_ok=True)
    sources = {}
    for path in glob.glob(os.path.join(assets_dir, "*")) if assets_dir else []:
        stem = os.path.splitext(os.path.basename(path))[0]
        if ASSET_ID_RE.match(stem):
            sources[stem] = path
    sizes, missing = {}, []
    for asset_id, max_side in sorted(wanted.items()):
        target = os.path.join(IMAGE_DIR, asset_id + ".webp")
        if os.path.exists(target):
            sizes[asset_id] = image_size(target)
        elif asset_id in sources:
            sizes[asset_id] = convert_image(sources[asset_id], target, max_side)
            print("  image", asset_id)
        else:
            missing.append(asset_id)
    for path in glob.glob(os.path.join(IMAGE_DIR, "*.webp")):
        if os.path.splitext(os.path.basename(path))[0] not in wanted:
            os.remove(path)
            print("  removed", os.path.basename(path))
    return sizes, missing


def picture(asset_id, sizes):
    if asset_id not in sizes:
        return None
    width, height = sizes[asset_id]
    return {"src": IMAGE_URL + asset_id + ".webp", "width": width, "height": height}


def percent(value):
    return round(value, 2)


def build_timeline(bands, this_year):
    formed = [b["formed"] for b in bands if b["formed"]]
    start = (min(formed) - TIMELINE_PAD_YEARS) // 10 * 10 if formed else this_year - 60
    end = this_year + 1
    span = end - start

    def at(y):
        return percent((min(max(y, start), end) - start) / span * 100)

    rows = {}
    for band in bands:
        if not band["formed"]:
            rows[band["id"]] = None
            continue
        stop = band["ended"] or this_year
        rows[band["id"]] = {
            "left": at(band["formed"]), "width": percent(at(stop) - at(band["formed"])),
            "dots": [{"at": at(s["year"]), "year": s["year"], "title": s["title"]}
                     for s in band["stories"] if s["year"] and start <= s["year"] <= end],
        }
    ticks = [{"year": y, "at": at(y)} for y in range(-(-start // 10) * 10, end + 1, 10)]
    return {"start": start, "end": end, "ticks": ticks}, rows


def years_text(band):
    if not band["formed"]:
        return "年份未填"
    return "%d–%d" % (band["formed"], band["ended"]) if band["ended"] else "%d 至今" % band["formed"]


def release_strip(band):
    """Where each release sits on the small year-distribution strip above the discography."""
    years = [r["year"] for r in band["releases"] if r["year"]]
    if len(years) < 2:
        return None
    first = min([band["formed"] or years[0]] + years)
    last = max([band["ended"] or 0] + years)
    stacked, dots = {}, []
    for release in band["releases"]:
        if not release["year"]:
            continue
        level = stacked.get(release["year"], 0)
        stacked[release["year"]] = level + 1
        x = STRIP_PAD + (release["year"] - first) / max(1, last - first) * (STRIP_WIDTH - 2 * STRIP_PAD)
        dots.append({"x": round(x, 1), "y": STRIP_BASELINE - level * STRIP_STACK_STEP, "year": release["year"],
                     "title": release["title"], "heard": release["heard"]})
    return {"first": first, "last": last, "width": STRIP_WIDTH, "pad": STRIP_PAD, "dots": dots}


def stories_about(band, field, name):
    """Stories that name this release or person, as jump targets."""
    return [{"index": i, "title": s["title"] or str(s["year"] or "") or "一段故事"}
            for i, s in enumerate(band["stories"]) if s[field] and s[field].lower() == name.lower()]


def all_values(band):
    values = {key: entries for key, entries in band["values"].items() if entries}
    values.update({FACET_PREFIX + name: entries for name, entries in band["facets"].items()})
    return values


def band_id_by_name(bands):
    return {name: band["id"] for band in bands for name in names_of(band)}


def publish(band, bands, sizes, row):
    values = band["values"]
    known = band_id_by_name(bands)
    dims = [{"key": key, "label": label, "values": values[key]} for key, label, _, _, _ in DIMS
            if key not in HIDDEN_DIMS and values[key]]
    dims += [{"key": FACET_PREFIX + name, "label": name, "values": entries} for name, entries in band["facets"].items()]
    return {
        "id": band["id"], "name": band["name"], "aliases": band["aliases"],
        "country": "".join(values["country"]), "city": "".join(values["city"]),
        "where": "，".join(values["city"] + values["country"]) or "地区未填",
        "formed": band["formed"], "ended": band["ended"], "years": years_text(band),
        "status": band["status"], "status_label": STATUS_LABELS[band["status"]],
        "note": band["note"], "added": band["added"],
        "genres": values["genres"], "dims": dims,
        "photo": picture(band["photo"], sizes), "photo_credit": band["photo_credit"],
        "heard": sum(1 for r in band["releases"] if r["heard"]),
        "strip": release_strip(band),
        "releases": [{**r, "cover": picture(r["cover"], sizes), "stories": stories_about(band, "release", r["title"])}
                     for r in band["releases"]],
        "people": [{**p, "stories": stories_about(band, "person", p["name"]),
                    "projects": [{"name": name, "id": known.get(name.lower())} for name in p["projects"]]}
                   for p in band["people"]],
        "stories": band["stories"],
        "shows": band["shows"], "shows_checked": band["shows_checked"], "shows_source": band["shows_source"],
        "links": connections(band, bands), "leads": outside_leads(band, bands),
        "timeline": row,
    }


def index_entry(band, published):
    """The slim copy of a band that the interactive index needs."""
    return {
        "id": band["id"], "name": band["name"], "where": published["where"], "years": published["years"],
        "formed": band["formed"], "ended": band["ended"], "status": band["status"], "note": band["note"],
        "values": all_values(band),
        "counts": {"releases": len(band["releases"]), "people": len(band["people"]), "stories": len(band["stories"])},
        "stories": [{"year": s["year"], "title": s["title"]} for s in band["stories"] if s["year"]],
        "links": [{"id": l["id"], "score": l["score"], "reasons": l["reasons"]} for l in published["links"]],
    }


def index_dims(bands):
    dims = [{"key": key, "label": label} for key, label, _, _, _ in DIMS]
    seen = set()
    for band in bands:
        for name in band["facets"]:
            if name not in seen:
                seen.add(name)
                dims.append({"key": FACET_PREFIX + name, "label": name})
    return dims


def load_export(export_dir):
    paths = sorted(glob.glob(os.path.join(export_dir, "bands", "*.json")))
    if not paths:
        sys.exit("no band documents under %s/bands — export the index first" % export_dir)
    bands = []
    for path in paths:
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        if not isinstance(raw, dict):
            sys.exit("%s is not a JSON object" % path)
        bands.append(normalize(os.path.splitext(os.path.basename(path))[0], raw))
    return sorted(bands, key=lambda b: (b["formed"] or 9999, b["name"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--export", required=True, help="directory holding bands/<id>.json")
    parser.add_argument("--assets", help="directory holding <asset id>.<ext> image files")
    args = parser.parse_args()

    bands = load_export(args.export)
    wanted = {}
    for band in bands:
        if band["photo"]:
            wanted[band["photo"]] = PHOTO_MAX_SIDE
        for release in band["releases"]:
            if release["cover"]:
                wanted[release["cover"]] = COVER_MAX_SIDE
    sizes, missing = sync_images(wanted, args.assets)

    today = datetime.date.today()
    timeline, rows = build_timeline(bands, today.year)
    published = [publish(b, bands, sizes, rows[b["id"]]) for b in bands]
    newest = max(published, key=lambda b: b["added"], default=None)
    data = {
        "synced": today.isoformat(),
        "stats": {
            "bands": len(published),
            "liked": sum(1 for b in published if b["status"] == "like"),
            "releases": sum(len(b["releases"]) for b in published),
            "heard": sum(b["heard"] for b in published),
            "countries": sorted({b["country"] for b in published if b["country"]}),
            "newest": {"name": newest["name"], "id": newest["id"], "added": newest["added"]} if newest else None,
        },
        "timeline": timeline,
        "bands": published,
        "index": {"dims": index_dims(bands), "bands": [index_entry(b, p) for b, p in zip(bands, published)]},
    }
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("%d bands, %d releases (%d heard), %d shows, %d images" % (
        len(published), data["stats"]["releases"], data["stats"]["heard"],
        sum(len(b["shows"]) for b in published), len(sizes)))
    for asset_id in missing:
        print("MISSING", asset_id)
    if missing:
        sys.exit("%d image(s) not found in --assets; download them and run again" % len(missing))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Sync Douban movie records (watched list, short reviews, long reviews) into the site.

Usage:
    python3 scripts/douban_sync.py                # full sync
    python3 scripts/douban_sync.py --pages 2      # only the newest 2 pages of the watched list

Writes:
    _data/movies.json                     one record per watched title, newest first
    images/movies/<id>.webp               self-hosted posters (Douban blocks hotlinking)
    _film_reviews/<date>-douban-<id>.md   long reviews (影评) as Markdown
    images/film-reviews/<id>/*.webp       images used inside long reviews

A synced review file is overwritten on every run unless its front matter has `locked: true`
(set that after you edit a synced review by hand). Files you write yourself are never touched.

Only public pages are read; no login is needed. Requests are spaced out to be polite.
"""
import argparse
import html
import io
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser

USER_ID = "204381462"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "_data", "movies.json")
POSTER_DIR = os.path.join(ROOT, "images", "movies")
REVIEW_DIR = os.path.join(ROOT, "_film_reviews")
REVIEW_IMG_DIR = os.path.join(ROOT, "images", "film-reviews")
PAGE_SIZE = 15
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

ITEM_RE = re.compile(r'<div class="item comment-item" data-cid="(\d+)"\s*>(.*?)</ul>', re.S)


def fetch(url, referer="https://movie.douban.com/", retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": referer})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:  # network hiccup or rate limit: back off and retry
            print(f"  retry {attempt + 1} for {url}: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}")


def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def pick(pattern, s, default=""):
    m = re.search(pattern, s, re.S)
    return m.group(1) if m else default


def parse_page(page):
    items = []
    for cid, body in ITEM_RE.findall(page):
        subject = pick(r"movie\.douban\.com/subject/(\d+)/", body)
        title = text(pick(r"<em>(.*?)</em>", body))
        names = [t.strip() for t in title.split(" / ")]
        intro = text(pick(r'<li class="intro">(.*?)</li>', body))
        rating = pick(r'class="rating(\d)-t"', body)
        tags = text(pick(r'<span class="tags">(.*?)</span>', body)).replace("标签:", "").split()
        items.append({
            "cid": cid,
            "id": subject,
            "title": names[0],
            "original": " / ".join(names[1:]),
            "url": f"https://movie.douban.com/subject/{subject}/",
            "poster_src": pick(r'<img[^>]*src="([^"]+)"', body),
            "year": pick(r"(\d{4})-\d{2}-\d{2}\(", intro) or pick(r"^(\d{4})", intro),
            "intro": intro,
            "rating": int(rating) if rating else 0,
            "date": pick(r'<span class="date">([^<]*)</span>', body).strip(),
            "comment": text(pick(r'<span class="comment">(.*?)</span>', body)),
            "tags": tags,
            "playable": "[可播放]" in body,
        })
    return items


def total_count(page):
    m = re.search(r"看过的影视\((\d+)\)", page)
    return int(m.group(1)) if m else None


def save_image(url, path, width, referer):
    if os.path.exists(path):
        return True
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(fetch(url, referer=referer))).convert("RGB")
        if img.width > width:
            img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        img.save(path, "WEBP", quality=80, method=6)
        time.sleep(0.3)
        return True
    except Exception as e:
        print(f"  image failed {url}: {e}", file=sys.stderr)
        return False


def save_poster(item):
    item["poster"] = f"/images/movies/{item['id']}.webp"
    path = os.path.join(POSTER_DIR, f"{item['id']}.webp")
    if not item["poster_src"] or not save_image(item["poster_src"], path, 300, item["url"]):
        item["poster"] = ""


class ReviewToMarkdown(HTMLParser):
    """Convert the HTML body of a Douban review into plain Markdown."""

    BLOCKS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "li", "figure"}

    def __init__(self, image_cb):
        super().__init__(convert_charrefs=True)
        self.image_cb = image_cb
        self.out, self.buf = [], []
        self.prefix, self.caption, self.in_caption, self.list_stack = "", False, False, []
        self.link = None

    def flush(self):
        line = "".join(self.buf).strip()
        self.buf = []
        if line:
            self.out.append(self.prefix + line)
        self.prefix = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "")
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.flush()
            self.prefix = "#" * max(2, int(tag[1])) + " "
        elif tag == "blockquote":
            self.flush()
            self.prefix = "> "
        elif tag in ("ul", "ol"):
            self.flush()
            self.list_stack.append(tag)
        elif tag == "li":
            self.flush()
            self.prefix = "1. " if self.list_stack and self.list_stack[-1] == "ol" else "- "
        elif tag == "div" and "image-caption" in cls and "wrapper" not in cls:
            self.flush()
            self.in_caption = True
        elif tag in self.BLOCKS:
            self.flush()
        elif tag == "br":
            self.buf.append("  \n")
        elif tag in ("strong", "b"):
            self.buf.append("**")
        elif tag in ("em", "i"):
            self.buf.append("*")
        elif tag == "a" and a.get("href"):
            self.link = a["href"]
            self.buf.append("[")
        elif tag == "img" and a.get("src"):
            self.flush()
            local = self.image_cb(a["src"])
            if local:
                self.out.append(f"![]({local})")
        elif tag == "hr":
            self.flush()
            self.out.append("---")

    def handle_endtag(self, tag):
        if tag in ("strong", "b"):
            self.buf.append("**")
        elif tag in ("em", "i"):
            self.buf.append("*")
        elif tag == "a" and self.link:
            self.buf.append(f"]({self.link})")
            self.link = None
        elif tag in ("ul", "ol") and self.list_stack:
            self.flush()
            self.list_stack.pop()
        elif self.in_caption and tag == "div":
            line = "".join(self.buf).strip()
            self.buf = []
            if line and self.out and self.out[-1].startswith("!["):
                self.out[-1] = self.out[-1].replace("![]", f"![{line}]", 1) + f"\n*{line}*"
            elif line:
                self.out.append(f"*{line}*")
            self.in_caption = False
        elif tag in self.BLOCKS:
            self.flush()

    def handle_data(self, data):
        self.buf.append(re.sub(r"\s+", " ", data))

    def markdown(self):
        self.flush()
        return "\n\n".join(self.out) + "\n"


def front_matter_locked(path):
    if not os.path.exists(path):
        return False
    with open(path, encoding="utf-8") as f:
        head = f.read(4000).split("\n---", 1)[0]
    return bool(re.search(r"^locked:\s*true\s*$", head, re.M))


def yaml_str(s):
    return json.dumps(s or "", ensure_ascii=False)


def sync_reviews():
    """Fetch every long review (影评) and write it as a Markdown document."""
    os.makedirs(REVIEW_DIR, exist_ok=True)
    reviews, start = [], 0
    while True:
        url = (f"https://m.douban.com/rexxar/api/v2/user/{USER_ID}/reviews"
               f"?type=movie&start={start}&count=20&ck=&for_mobile=1")
        data = json.loads(fetch(url, referer=f"https://m.douban.com/people/{USER_ID}/"))
        reviews.extend(data.get("reviews", []))
        start += 20
        if start >= data.get("total", 0):
            break
        time.sleep(random.uniform(2.0, 4.0))
    print(f"long reviews: {len(reviews)}")

    for r in reviews:
        rid, subject = r["id"], r.get("subject") or {}
        date = r.get("create_time", "")[:10]
        path = os.path.join(REVIEW_DIR, f"{date}-douban-{rid}.md")
        if front_matter_locked(path):
            print(f"  skip locked review {rid}")
            continue
        body = json.loads(fetch(f"https://movie.douban.com/j/review/{rid}/full",
                                referer=r["url"]))["body"]
        m = re.search(r'<div class="review-content[^>]*>(.*?)</div>\s*<div class="main-author"', body, re.S)
        content = m.group(1) if m else body
        img_dir = os.path.join(REVIEW_IMG_DIR, rid)
        os.makedirs(img_dir, exist_ok=True)

        def image_cb(src):
            name = os.path.splitext(os.path.basename(urllib.parse.urlparse(src).path))[0] + ".webp"
            ok = save_image(src, os.path.join(img_dir, name), 1000, r["url"])
            return f"/images/film-reviews/{rid}/{name}" if ok else ""

        conv = ReviewToMarkdown(image_cb)
        conv.feed(content)
        sid = subject.get("id", "")
        rating = (r.get("rating") or {}).get("value") or 0
        fm = "\n".join([
            "---",
            f"title: {yaml_str(r.get('title'))}",
            f"film: {yaml_str(subject.get('title'))}",
            f"film_id: {yaml_str(sid)}",
            f"film_url: https://movie.douban.com/subject/{sid}/",
            f"poster: /images/movies/{sid}.webp",
            f"rating: {int(rating)}",
            f"date: {r.get('create_time', '')} +0800",
            f"spoiler: {'true' if r.get('spoiler') else 'false'}",
            "source: douban",
            f"douban_url: {r['url']}",
            "# Set `locked: true` after editing this file by hand so the sync script keeps your edits.",
            "locked: false",
            "---",
            "",
            "",
        ])
        with open(path, "w", encoding="utf-8") as f:
            f.write(fm + conv.markdown())
        print(f"  wrote {os.path.relpath(path, ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=0, help="only fetch the newest N pages (0 = all)")
    ap.add_argument("--skip-reviews", action="store_true", help="do not sync long reviews")
    args = ap.parse_args()
    sys.stdout.reconfigure(line_buffering=True)
    os.makedirs(POSTER_DIR, exist_ok=True)

    old = []
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, encoding="utf-8") as f:
            old = json.load(f)

    fetched, start, total = [], 0, None
    while True:
        url = (f"https://movie.douban.com/people/{USER_ID}/collect"
               f"?start={start}&sort=time&rating=all&filter=all&mode=grid")
        page = fetch(url).decode("utf-8")
        total = total or total_count(page)
        items = parse_page(page)
        print(f"page {start // PAGE_SIZE + 1}: {len(items)} items (total {total})")
        if not items:
            break
        fetched.extend(items)
        start += PAGE_SIZE
        if (args.pages and start // PAGE_SIZE >= args.pages) or (total and start >= total):
            break
        time.sleep(random.uniform(2.0, 4.0))

    # Merge: freshly fetched records win; older ones not refetched are kept.
    seen = {it["cid"] for it in fetched}
    merged = fetched + [it for it in old if it["cid"] not in seen]
    merged.sort(key=lambda it: (it["date"], it["cid"]), reverse=True)

    for i, it in enumerate(merged):
        save_poster(it)
        if i % 50 == 0:
            print(f"posters {i}/{len(merged)}")

    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=1)
    n_comments = sum(1 for it in merged if it["comment"])
    print(f"wrote {len(merged)} records ({n_comments} with short reviews) to {DATA_PATH}")

    if not args.skip_reviews:
        sync_reviews()


if __name__ == "__main__":
    main()

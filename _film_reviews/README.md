# 影评 / Film reviews

这个文件夹里的每个 `.md` 文件就是 Films 页上的一篇长影评，会生成独立页面
`/films/reviews/<文件名>/`。

## 三种更新方式

| 想做什么 | 怎么做 |
| --- | --- |
| 同步豆瓣上的新短评 / 新影评 | GitHub 仓库 → **Actions** → **Sync Douban films** → **Run workflow**（每周一也会自动跑一次） |
| 直接在网站上写一篇新影评 | 在本文件夹点 **Add file → Create new file**，按下面的模板写，Commit 即可 |
| 在本地同步（Actions 被豆瓣拦截时用） | `python3 scripts/douban_sync.py --pages 3`，然后 `git add -A && git commit && git push` |

`--pages 3` 只抓最新 3 页（45 条）看过记录，够日常增量；不带参数就是全量重抓。
影评每次都会全量检查。

## 新影评模板

文件名：`YYYY-MM-DD-随便一个英文短名.md`，例如 `2026-10-01-perfect-days.md`

```markdown
---
title: "影评标题"
film: "电影名"
film_id: "豆瓣条目 ID（可选，用于显示海报并和短评互链）"
film_url: https://movie.douban.com/subject/xxxxxx/
poster: /images/movies/xxxxxx.webp
rating: 5
date: 2026-10-01 20:00:00 +0800
spoiler: false
---

正文用 Markdown 写。图片放到 `images/film-reviews/` 下，然后这样引用：

![图片说明](/images/film-reviews/my-image.jpg)
```

`film_id` 就是豆瓣电影链接里的数字；如果这部片已经在“看过”列表里，海报已在
`images/movies/<film_id>.webp`，直接填上即可。

## 手动修改从豆瓣同步来的影评

文件名里带 `douban` 的影评是脚本同步的，每次同步都会被覆盖。
如果你想在这里改它，把 front matter 里的 `locked: false` 改成 `locked: true`，
之后同步就会跳过这篇。

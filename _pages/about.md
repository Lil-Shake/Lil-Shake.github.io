---
permalink: /
title: "About me"
description: "Homepage of Xinyao Liao, a computer science master's student at HUST, focusing on visual generative models and reinforcement learning."
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

I am Xinyao Liao, a third-year master's student in Computer Science at Huazhong University of Science & Technology (HUST), supervised by [Prof. Wei Wei](https://www.eric-weiwei.com/). I am currently a research intern in the CVML Lab at the National University of Singapore (NUS), advised by [Prof. Angela Yao](https://www.comp.nus.edu.sg/~ayao/). Previously, I completed a B.E. in Information Security and a B.A. in Philosophy, both at HUST.

My recent research focuses on visual generative models and reinforcement learning. I am also interested in broader questions related to Artificial General Intelligence (AGI), including the design of general training objectives and learning paradigms.

## News

- **[Feb 2026]** [VA-π](https://lil-shake.github.io/va-pi.github.io/) accepted to **CVPR 2026**!
- **[Jan 2026]** [reAR](https://qy-h00.github.io/reAR/) accepted to **ICLR 2026**!
- **[Jul 2025]** Joined CVML Lab at NUS as a research intern, advised by [Prof. Angela Yao](https://www.comp.nus.edu.sg/~ayao/).
- **[Jul 2024]** [UniQ](/publication/uniq) accepted to **ACM MM 2024**!
- **[Sep 2023]** Started my master's degree at HUST.

## Publications

{% if site.author.googlescholar %}
<!-- <div class="wordwrap">You can also find my articles on <a href="{{site.author.googlescholar}}">my Google Scholar profile</a>.</div> -->
{% endif %}

{% include base_path %}

{% for post in site.publications reversed %}
{% include archive-single.html %}
{% endfor %}

## More

Other than research, let's read, watch movies, listen to music, and create fun things!

---
permalink: /
title: "About me"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

I am Xinyao Liao, a third-year Master’s student in Computer Science at Huazhong University of Science and Technology (HUST), supervised by [Prof. Wei Wei](https://www.eric-weiwei.com/). I am currently a research intern at the CVML Lab at the National University of Singapore (NUS), advised by [Prof. Angela Yao](https://www.comp.nus.edu.sg/~ayao/). I previously completed a B.E. in Information Security and a B.A. in Philosophy at HUST.

My recent research focuses on visual generative models and reinforcement learning. I am also interested in broader questions related to AGI, including the design of general training objectives and learning paradigms.

Publications
======
{% if site.author.googlescholar %}
<!-- <div class="wordwrap">You can also find my articles on <a href="{{site.author.googlescholar}}">my Google Scholar profile</a>.</div> -->
{% endif %}

{% include base_path %}

{% if site.publication_category %}
{% for category in site.publication_category  %}
{% assign title_shown = false %}
{% for post in site.publications reversed %}
{% if post.category != category[0] %}
{% continue %}
{% endif %}
{% unless title_shown %}
<h3>{{ category[1].title }}</h3><hr />
{% assign title_shown = true %}
{% endunless %}
{% include archive-single.html %}
{% endfor %}
{% endfor %}
{% else %}
{% for post in site.publications reversed %}
{% include archive-single.html %}
{% endfor %}
{% endif %}

More
======
Other than research, let's read, watch movies, listen to music and create fun things!

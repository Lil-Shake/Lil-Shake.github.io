---
permalink: /
title: "About me"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

I am Xinyao Liao, a third-year Master’s student in Computer Science at Huazhong University of Science and Technology (HUST), supervised by Prof. Wei Wei. I am currently a research intern at the CVML Lab at the National University of Singapore, advised by Prof. Angela Yao. I previously completed a B.E. in Information Security and a B.A. in Philosophy at HUST.

My recent research focuses on visual generative models and reinforcement learning. I am also interested in broader questions related to AGI, including the design of general training objectives and learning paradigms that may guide us toward more general intelligence, such as VLA models and world models.

Publications
======
{% if site.author.googlescholar %}
<div class="wordwrap">You can also find my articles on <a href="{{site.author.googlescholar}}">my Google Scholar profile</a>.</div>
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

Service and leadership
======
* Currently signed in to 43 different slack teams

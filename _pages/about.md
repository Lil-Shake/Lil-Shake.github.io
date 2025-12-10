---
permalink: /
title: "Home"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

Welcome! This site highlights my work and research while keeping navigation simple. Explore my background below or head to the blog for updates and longer reflections.

Education
======
* Ph.D in Version Control Theory, GitHub University, 2018 (expected)
* M.S. in Jekyll, GitHub University, 2014
* B.S. in GitHub, GitHub University, 2012

Work experience
======
* Spring 2024: Academic Pages Collaborator
  * GitHub University
  * Duties includes: Updates and improvements to template
  * Supervisor: The Users

* Fall 2015: Research Assistant
  * GitHub University
  * Duties included: Merging pull requests
  * Supervisor: Professor Hub

* Summer 2015: Research Assistant
  * GitHub University
  * Duties included: Tagging issues
  * Supervisor: Professor Git

Skills
======
* Skill 1
* Skill 2
  * Sub-skill 2.1
  * Sub-skill 2.2
  * Sub-skill 2.3
* Skill 3

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

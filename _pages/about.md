---
permalink: /
title: "Xinyao Liao"
description: "Xinyao Liao is a PhD student in Computer Science at the National University of Singapore, working on visual generative models, reinforcement learning, and adaptive learning systems."
author_profile: false
redirect_from:
  - /about/
  - /about.html
---

{% include site-style.html %}
<link rel="stylesheet" href="/assets/css/homepage.css">

<div class="site hp">
  <aside class="hp-id" aria-label="Profile">
    <img class="hp-id__photo" src="/images/profile-600.jpg" alt="Portrait of Xinyao Liao" width="600" height="600" fetchpriority="high">
    <div class="hp-id__text">
      <h1 class="hp-id__name">Xinyao Liao</h1>
      <p class="hp-id__role">PhD Student<br>National University of Singapore</p>
      <ul class="hp-id__links">
        <li><a href="mailto:liaoxinyao@u.nus.edu" title="liaoxinyao@u.nus.edu">Email</a></li>
        <li><a href="https://scholar.google.com/citations?user=HvNNX7sAAAAJ&hl=en">Google Scholar</a></li>
        <li><a href="https://github.com/Lil-Shake">GitHub</a></li>
        <li><a href="https://orcid.org/0009-0003-2613-6088">ORCID</a></li>
      </ul>
    </div>
  </aside>

  <div class="hp-main">
    <section class="sec hp-bio" aria-label="About">
      <p>
        I am a PhD student in Computer Science at the National University of Singapore,
        working with <a href="https://www.comp.nus.edu.sg/~ayao/">Prof. Angela Yao</a> in the
        Computer Vision and Machine Learning (CVML) group. My research is on visual generative
        models and reinforcement learning — in particular autoregressive image and video
        generation, and methods that let models improve at inference time and through experience.
      </p>
      <p>
        Before NUS, I studied Computer Science (Information Security) and Philosophy at
        Huazhong University of Science and Technology.
      </p>
      <div class="hp-bio__interests">
        <span>Interests</span>
        <ul>
          <li>Visual generative models</li>
          <li>Autoregressive generation</li>
          <li>Reinforcement learning</li>
          <li>Test-time adaptation</li>
          <li>Continual and self-improving systems</li>
        </ul>
      </div>
    </section>

    <section class="sec" aria-labelledby="hp-news">
      <h2 id="hp-news">News</h2>
      <ol class="hp-news">
        <li><time datetime="2026-08">Aug 2026</time><p>Started my PhD at NUS in Angela Yao's CVML group.</p></li>
        <li><time datetime="2026-05">May 2026</time><p>Released <a href="https://arxiv.org/abs/2605.30317">VPG</a>, a training-free guidance method for autoregressive image and video generation.</p></li>
        <li><time datetime="2026-02">Feb 2026</time><p><a href="https://lil-shake.github.io/va-pi.github.io/">VA-π</a> accepted to CVPR 2026.</p></li>
        <li><time datetime="2026-01">Jan 2026</time><p><a href="https://qy-h00.github.io/reAR/">reAR</a> accepted to ICLR 2026.</p></li>
      </ol>
    </section>

    <section class="sec" aria-labelledby="hp-pubs">
      <h2 id="hp-pubs">Publications</h2>
      <ol class="hp-pubs">
        {% assign pubs = site.publications | sort: "date" | reverse %}
        {% for pub in pubs %}
          {% assign teaser = pub.header.teaser | default: pub.teaser %}
          {% assign primary_url = pub.website | default: pub.paperurl %}
          {% assign code_url = pub.code | default: pub.codeurl %}
          <li class="hp-pub">
            {% if teaser and teaser != "" %}
              <a class="hp-pub__thumb" href="{{ primary_url }}" tabindex="-1" aria-hidden="true">
                <img src="/images/{{ teaser }}" alt="" width="480" height="240" loading="lazy" decoding="async">
              </a>
            {% endif %}
            <div class="hp-pub__body">
              <h3 class="hp-pub__title"><a href="{{ primary_url }}">{{ pub.title }}</a></h3>
              <p class="hp-pub__authors">
                {%- for a in pub.authors -%}
                  {%- assign clean = a | remove: "*" | strip -%}
                  {%- if clean == "Xinyao Liao" -%}<strong>{{ a }}</strong>{%- else -%}{{ a }}{%- endif -%}
                  {%- unless forloop.last -%}, {% endunless -%}
                {%- endfor -%}
              </p>
              <p class="hp-pub__meta">
                {% assign pub_year = pub.date | date: "%Y" %}
                <em>{{ pub.venue }} {{ pub.venue_year | default: pub_year }}</em>
                {% if pub.paperurl %}<a href="{{ pub.paperurl }}">paper</a>{% endif %}
                {% if pub.website %}<a href="{{ pub.website }}">project</a>{% endif %}
                {% if code_url %}<a href="{{ code_url }}">code</a>{% endif %}
              </p>
            </div>
          </li>
        {% endfor %}
      </ol>
      <p class="note">* Equal contribution.</p>
    </section>

    <section class="sec" aria-labelledby="hp-misc">
      <h2 id="hp-misc">Elsewhere</h2>
      <p>
        Outside research I read, listen to music, climb, and build small things.
        I write occasionally on the <a href="/year-archive/">blog</a> and keep notes on
        <a href="/films/">films</a> I've watched.
      </p>
    </section>
  </div>
</div>

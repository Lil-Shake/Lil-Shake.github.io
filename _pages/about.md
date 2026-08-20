---
permalink: /
title: "Xinyao Liao"
description: "Xinyao Liao is a PhD student in Computer Science at the National University of Singapore, working on visual generative models, reinforcement learning, and adaptive learning systems."
author_profile: false
classes: wide
redirect_from:
  - /about/
  - /about.html
---

<link rel="stylesheet" href="/assets/css/home.css">

<div class="home-shell">
  <section class="home-hero reveal" aria-labelledby="home-title">
    <div>
      <div class="home-eyebrow">PhD Student · NUS CVML · Fall 2026</div>
      <h1 id="home-title">Hi, I'm <span>Xinyao Liao</span>.</h1>
      <p class="home-lede">
        I am a PhD student in Computer Science at the <strong>National University of Singapore</strong>,
        working with <a href="https://www.comp.nus.edu.sg/~ayao/">Prof. Angela Yao</a> in the
        <strong>Computer Vision &amp; Machine Learning (CVML) Group</strong>. My research explores
        visual generative models, reinforcement learning, and learning systems that can improve at
        inference time and through experience.
      </p>
      <div class="home-tags" aria-label="Research interests">
        <span class="home-tag">Visual Generative Models</span>
        <span class="home-tag">Autoregressive Generation</span>
        <span class="home-tag">Reinforcement Learning</span>
        <span class="home-tag">Test-Time Adaptation</span>
        <span class="home-tag">Continual / Self-Improving Systems</span>
      </div>
      <div class="home-actions">
        <a class="home-button home-button--primary" href="#research">Explore research</a>
        <a class="home-button" href="https://scholar.google.com/citations?user=HvNNX7sAAAAJ&hl=en">Google Scholar ↗</a>
        <a class="home-button" href="https://github.com/Lil-Shake">GitHub ↗</a>
      </div>
    </div>

    <aside class="home-profile-card" aria-label="Profile">
      <img src="/images/academic_profile_2.jpg" alt="Portrait of Xinyao Liao.">
      <div class="home-profile-meta">
        <div><strong>Xinyao Liao</strong>Singapore · NUS</div>
        <div>CVML</div>
      </div>
    </aside>
  </section>

  <section class="home-section reveal" id="updates">
    <div class="home-section-heading">
      <div>
        <p class="home-kicker">Now</p>
        <h2>Recent updates</h2>
      </div>
      <p class="home-section-note">A compact timeline of research and academic milestones.</p>
    </div>

    <div class="home-news">
      <div class="home-news-item">
        <div class="home-news-date">Aug 2026</div>
        <p>Started my PhD in Computer Science at <strong>NUS</strong>, joining Angela Yao's CVML group.</p>
      </div>
      <div class="home-news-item">
        <div class="home-news-date">May 2026</div>
        <p>Released <a href="https://arxiv.org/abs/2605.30317"><strong>VPG</strong></a>, a training-free guidance method for autoregressive image and video generation.</p>
      </div>
      <div class="home-news-item">
        <div class="home-news-date">Feb 2026</div>
        <p><a href="https://lil-shake.github.io/va-pi.github.io/"><strong>VA-π</strong></a> was accepted to <strong>CVPR 2026</strong>.</p>
      </div>
      <div class="home-news-item">
        <div class="home-news-date">Jan 2026</div>
        <p><a href="https://qy-h00.github.io/reAR/"><strong>reAR</strong></a> was accepted to <strong>ICLR 2026</strong>.</p>
      </div>
    </div>
  </section>

  <section class="home-section reveal" id="research">
    <div class="home-section-heading">
      <div>
        <p class="home-kicker">Featured research</p>
        <h2>Learning to generate — and improve.</h2>
        <p class="home-section-note">I am especially interested in objectives and inference procedures that make generative models more reliable, adaptive, and efficient.</p>
      </div>
    </div>

    <div class="home-project-grid">
      <article class="home-project">
        <div class="home-project-visual home-project-visual--vpg" aria-hidden="true">VPG</div>
        <span class="home-project-badge">2026 · Visual AR</span>
        <h3>Visual Prefix Guidance</h3>
        <p>Training-free inference-time guidance that contrasts generated and corrupted prefixes to reduce autoregressive prefix drift.</p>
        <div class="home-project-links">
          <a href="https://arxiv.org/abs/2605.30317">Paper</a>
          <a href="https://vpg-interactive-talk.lilshake66.chatgpt.site">Interactive</a>
        </div>
      </article>

      <article class="home-project">
        <div class="home-project-visual home-project-visual--vapi" aria-hidden="true">VA-π</div>
        <span class="home-project-badge">CVPR 2026</span>
        <h3>Variational Policy Alignment</h3>
        <p>Pixel-aware reinforcement learning for autoregressive image generation, aligning token policies with image-space quality.</p>
        <div class="home-project-links">
          <a href="https://lil-shake.github.io/va-pi.github.io/">Project</a>
          <a href="https://github.com/Lil-Shake/VA-Pi">Code</a>
        </div>
      </article>

      <article class="home-project">
        <div class="home-project-visual home-project-visual--coca" aria-hidden="true">CoCA</div>
        <span class="home-project-badge">Diffusion RL</span>
        <h3>Step-Level Reward for T2I RL</h3>
        <p>Turning trajectory-level supervision into step-level learning signals for more effective reinforcement learning of diffusion models.</p>
        <div class="home-project-links">
          <a href="https://github.com/Lil-Shake/CoCA">Code</a>
        </div>
      </article>
    </div>
  </section>

  <section class="home-section reveal" id="publications">
    <div class="home-section-heading">
      <div>
        <p class="home-kicker">Publications</p>
        <h2>Research archive</h2>
      </div>
      <span class="home-section-note" id="pub-count" aria-live="polite"></span>
    </div>

    <div class="home-filterbar" role="group" aria-label="Filter publications">
      <button class="home-filter" type="button" data-pub-filter="all" aria-pressed="true">All</button>
      <button class="home-filter" type="button" data-pub-filter="2026" aria-pressed="false">2026</button>
      <button class="home-filter" type="button" data-pub-filter="earlier" aria-pressed="false">Earlier</button>
    </div>

    <div id="publication-list" class="home-publications">
      {% include base_path %}
      {% for post in site.publications reversed %}
        {% include archive-single.html %}
      {% endfor %}
    </div>
  </section>

  <section class="home-section reveal" id="about">
    <div class="home-about-card">
      <div>
        <p class="home-kicker">Beyond research</p>
        <h2>Curious about systems, ideas, and the world around them.</h2>
        <p>Before my PhD, I studied Computer Science / Information Security and Philosophy at HUST. Outside research, I enjoy reading, films, music, climbing, and building small things for fun.</p>
      </div>
      <a class="home-button" href="mailto:xinyao@hust.edu.cn">Email me</a>
    </div>
  </section>
</div>

<script src="/assets/js/home.js" defer></script>

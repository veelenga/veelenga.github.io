---
layout: archive
title: "Blog"
---

{% assign sorted_posts = site.posts | sort: 'date' | reverse %}

<div class="post-list">
{% for post in sorted_posts %}
  <div class="post-list__item">
    <a href="{{ post.url }}" class="post-list__link">
      <h2 class="post-list__title">{{ post.title }}</h2>
      <div class="post-list__meta">
        <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%b %-d, %Y" }}</time>
        {% assign words = post.content | strip_html | number_of_words %}
        {% if words >= 180 %}
          <span class="post-list__meta-sep">&middot;</span>
          <span>{{ words | divided_by: 80 }} min read</span>
        {% endif %}
      </div>
      {% if post.excerpt %}
        <p class="post-list__excerpt">{{ post.excerpt | strip_html | truncate: 160 }}</p>
      {% endif %}
    </a>
  </div>
{% endfor %}
</div>

---
layout: archive
header:
  disable: true
tags:
  all: true
---

{% include base_path %}

{% assign sorted_posts = site.posts | sort: 'date' | reverse %}
{% for post in sorted_posts %}
  {% include archive-single.html %}
{% endfor %}

<hr>

<section class="page__meta">
  <p class="page__taxonomy">
    <strong><i class="fa fas fa-tags" aria-hidden="true"></i> Browse by tag: </strong>
    <span itemprop="keywords">
      {% include available-tags.html %}
    </span>
  </p>
</section>

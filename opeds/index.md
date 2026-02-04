---
layout: base.njk
title: Opinions
---
# Opinions

<ul>
{% for item in collections.opeds %}
  <li>
    <a href="{{ item.url }}">{{ item.data.title }}</a>
    {% assign s = summaries[item.fileSlug] %}
    {% if s %}
      <p class="summary">{{ s }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>

---
layout: base.njk
title: Investigations
---
# Investigations

<ul>
{% for item in collections.investigate %}
  <li>
    <a href="{{ item.url }}">{{ item.data.title }}</a>
    {% assign s = summaries[item.fileSlug] %}
    {% if s %}
      <p class="summary">{{ s }}</p>
    {% endif %}
  </li>
{% endfor %}
</ul>

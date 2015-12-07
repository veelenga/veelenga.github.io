---
layout: post
title: "Speed up Rails 4 in development mode"
modified:
categories:
excerpt: A quickest way to speed up your development with Rails 4.
tags: [rails, ruby, speed-up, speed, development, server]
image:
  thumb: logos/ruby.png
date: 2015-10-23T23:38:29+03:00
comments: true
---

Being working with a large Rails project you may face with a problem of a slow page rendering.
One of the reasons why this might happen is that your particular page has a lot of assets and browser
does huge amount of requests to download them. Fortunately, Rails 4 has a nice
feature for preprocessing those assets. You may find the following in `config/development.rb`:

{% highlight ruby %}
# Debug mode disables concatenation and preprocessing of assets.
# This option may cause significant delays in view rendering with a large
# number of complex assets.
config.assets.debug = false
{% endhighlight %}

With development tools in Safari browser we can notice the difference in both modes.

<figure>
  <img src="/images/rails-speedup/debug_true.png">
</figure>
When debug mode is on, browser loads 197 assets (totally 2.50 MB) and renders a page in 14.53 seconds.

<figure>
  <img src="/images/rails-speedup/debug_false.png">
</figure>
But when debug mode is off, browser loads only 14 assets and renders the same page in 1.17 seconds, which almost 14 times faster. Wow!

<br/>

With `config.assets.debug = false` all assets are bundled into files like `application.css` and `application.js`.
This is a bit different from production mode and there is no need in server restart to pick up the change of the asset.
But this might *not* always be very convenient in development mode because it will be much harder to debug
the front-end part.

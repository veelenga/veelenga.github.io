---
title: "New Year countdown With FlipClock.js"
modified:
categories:
excerpt: Just a quick way to create awesome New Year Countdown.
tags: [js]
date: 2015-12-23T15:14:57+02:00
---

[FlipClock.js](http://flipclockjs.com/) is a great library for creating clocks, timers, counters etc.
Let's create a New Year Countdown timer. Why ? Because New Year's Eve is coming... and it's fun.

Well, first of all we have to define `new-year-clock` element on the page:

{% highlight html %}
<body>
  <div class="new-year-clock"></div>
</body>
{% endhighlight %}

And now we are ready to add a little snippet of javascript, which calculates the time
left to the upcoming 1st of January and initializes FlipClock:

{% highlight javascript %}
$(document).ready(function() {
    var now = new Date();
    var once  = new Date(now.getFullYear() + 1, 0, 1);
    var time = once.getTime() / 1000 - now.getTime() / 1000;
    $('.new-year-clock').FlipClock(time, {
        clockFace: 'DailyCounter',
        countdown: true
    });
});
{% endhighlight %}

Done, we have a New Year Countdown timer. So easy. It's amazing!

Finally, after some styling, checkout a [demo](http://veelenga.com/new-year-countdown/)
and a code on [Github](https://github.com/veelenga/new-year-countdown).

Happy New Year!

---
layout: post
title: "Observer design pattern in Crystal language"
date: 2015-12-30T12:48:44+03:00
comments: true
excerpt: "A post where I want to share my thoughts regarding an implementation of an Observer design pattern in Crystal language."
tags: [blog, blogging, design, patterns, pattern, crystal, crystallang, observer, observable, programming, oop, object oriented programming]
published: true
---

Being a developer you probably have heart about Observer design pattern. Perhaps, you have even used it in your complex system with subscribers and notifications. This article is about how to implement Observer pattern in Crystal language and what are the common features of this language we can use there to tune it. If you are not familiar with Observer design pattern I will suggest you to read this [article](http://www.blackwasp.co.uk/Observer.aspx) before.

<br>

Say, we are developing a game where two units (fighters) fight with each other. Each fighter has a name and amount of health. Fighter can make a damage to other fighter. If fighter's health is 0 - fighter is dead.
Our another requirement is to update stats when fighter is damaged to let player know current health of his fighter. And the last thing we would like to notice is a notification about death. We want to congratulate a winner or do some other actions.

<br>

Of course, first that comes to the mind is a popular [Mortal Kombat](https://en.wikipedia.org/wiki/Mortal_Kombat) video game and I will suggest you to do not hesitate to imagine it in that way. Actually, we will not write a new game or something like that, we just need a concept.

<br>

Next are going to implement this in high level manner.

## Observable (or Subject)

At first we need to develop a `Fighter` class. Here is how it might look:

{% highlight ruby %}
class Fighter
  getter name, health

  def initialize(@name)
    @health = 100
  end

  def damage(rate)
    if @health > rate
      @health -= rate
    else
      @health = 0
    end
  end

  def is_dead?
    @health <= 0
  end
end
{% endhighlight %}

It meets our fighter's requirements: fighter has a name, health and can be damaged by another fighter.

<br>

The idea of an Observer pattern is to notify subscribers when subject's state changes. Subject in our case is represented by `Fighter` class. But it need to be able to notify observers when fighter is damaged. This is where `Observable` modules comes (the most interesting part):

{% highlight ruby %}
module Observable(T)
  getter observers

  def add_observer(observer)
    @observers ||= [] of T
    @observers.not_nil! << observer
  end

  def delete_observer(observer)
    @observers.try &.delete(observer)
  end

  def notify_observers
    @observers.try &.each &.update self
  end
end
{% endhighlight %}

We want to emphasize few points:

1. This is a module (not a class) because we want to include all this functionality in our `Fighter` class and leave a way to inherit `Fighter` from another class in future. Crystal does not support multiple inheritance thus we can use the same approach as used by Ruby's built-in [Observer](https://github.com/ruby/ruby/blob/trunk/lib/observer.rb).

2. We used generics (type `T`) to define type of an observer. This makes our subject more general and it is not coupled with concrete class.

3. We initialize a list of observers on demand (another idea from Ruby's built-in Observer). That's why our list of observers at some point of time may be `nil` and that's why we need to use `try` and `not_nil!` methods to ensure that we do not call observer's methods on `nil` object and prevent compile errors.

<br>

We can't include `Observable` module in `Fighter` class currently because we do not have an `Observer`. In other words, we do not know a type of `T`. So, let's create few observers.

## Observer

Here is how an interface for our Observer might look:

{% highlight ruby %}
abstract class Observer
  abstract def update(fighter)
end
{% endhighlight %}

Then we can implement concrete observers (`Stats` and `DieAction`):

{% highlight ruby %}
class Stats < Observer
  def update(fighter)
    puts "Updating stats: #{fighter.name}'s health is #{fighter.health}"
  end
end
{% endhighlight %}

{% highlight ruby %}
class DieAction < Observer
  def update(fighter)
    puts "#{fighter.name} is dead. Fight is over!" if fighter.is_dead?
  end
end
{% endhighlight %}

The last thing we need to do is to include `Observable` module into our `Fighter` class:

{% highlight ruby %}
class Fighter
  include Observable(Observer)
  #...
end
{% endhighlight %}

Notice how we define a type of our `Observable` module when we include it.

## Wrapup

We are ready to run a simple example:

{% highlight ruby %}
# Sample
fighter = Fighter.new("Scorpion")

fighter.add_observer(Stats.new)
fighter.add_observer(DieAction.new)

fighter.damage(10)
# Updating stats: Scorpion's health is 90

fighter.damage(30)
# Updating stats: Scorpion's health is 60

fighter.damage(75)
# Updating stats: Scorpion's health is 0
# Scorpion is dead. Fight is over!
{% endhighlight %}

Crystal's type system is very flexible. It allows us to use generics, helps to prevent runtime errors and gives ability
to write concise and easy to read code. In our implementation of Observer pattern we may found examples of all mentioned points.

<br>

Source code for example used in this article you may find in [Crystal Patterns](https://github.com/veelenga/crystal-patterns/blob/master/behavioral/observer.cr) Github repo.

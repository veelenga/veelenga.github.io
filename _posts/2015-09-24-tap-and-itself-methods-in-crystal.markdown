---
title: "Methods tap and itself in Crystal"
date: 2015-09-24T11:52:42+03:00
excerpt: "After reading this post you will know why Object#tap and Object#itself methods are so useful in Crystal language and when to use them."
tags: [crystal-lang, functional programming]
published: true
---

Method [Object#tap](http://crystal-lang.org/api/Object.html#tap%28%26block%29-instance-method) in Crystal yields to the block and then returns self. [Object#itself](http://crystal-lang.org/api/Object.html#itself-instance-method) just returns self. Why do we need those methods? Let's look at few examples.

### Send itself to the chain

As expected all objects in Crystal return self with `itself` method:

{% highlight ruby %}
p 10.itself   # 10
p "1".itself  # "1"
p :sym.itself # :sym
p true.itself # true
{% endhighlight %}

`nil`, collections and other objects are not exceptions:

{% highlight ruby %}
p nil.itself                                 # nil
p [1, 2].itself                              # [1, 2]
p ({"1" => "2"} of String => String).itself  # {"1" => "2"}
p /1/.itself                                 # /1/
# ...
{% endhighlight %}

Moreover, `itself` returns exactly the same object, not a clone or newly created one, this is the same object. Here is a good example from official documentation:

{% highlight ruby %}
str = "hello"
str.itself.object_id == str.object_id #=> true
{% endhighlight %}

So why do we need it if we can just type `str` instead of `str.itself`? It comes from the functional programming where you can create a chain of method calls that successively transform some data. Those transformations (map, filter, reject or whatever you need to do) may accept an object and return some new object by calling a method. And in that case, the simplest transformation is to return the object unmodified. Consider the following example:

{% highlight ruby %}
# Group elements of array by it's values (by itself).
p [1,2,4,1,2,2,3].group_by {|x| x}  # {1 => [1, 1], 2 => [2, 2, 2], 4 => [4], 3 => [3]}
{% endhighlight %}

With `itself` we can rewrite it in a more elegant and readable way:

{% highlight ruby %}
p [1,2,4,1,2,2,3].group_by &.itself # {1 => [1, 1], 2 => [2, 2, 2], 4 => [4], 3 => [3]}
{% endhighlight %}

Seems reasonable to have this method in standard library.

### Tap into the block

`tap` method also returns self, but a main difference between `tap` and `itself` is that `tap` accepts a block. It other words `x.itself` is equivalent to `x.tap{}`. But if it accepts block, it could have another purpose. Take a look at the following:

{% highlight ruby %}
class Team
  def initialize
    @players = [] of String
  end

  def <<(player)
    @players << player
  end

  def any?
    @players.each {|player| return true if yield player}
    false
  end

  def any?
    any? &.itself
  end
end

team = Team.new.tap do |t|
  t << "Player1"
  t << "Player2"
  t << "Player3"
end

p team.any?                          # true
p team.any? {|player| player =~ /2/} # true
p team.any? {|player| player =~ /4/} # false
{% endhighlight %}

This example uses both methods. `itself` (in `any?` method without a block) is used to pass itself to the block in `any?` method with the block. This is exactly how it is used in Crystal's standard library in [`Enumerable`](http://crystal-lang.org/api/Enumerable.html) and [`Iterator`](http://crystal-lang.org/api/Iterator.html) modules. `tap` is used to initialize data on object in a yielded block. From the example you can see that with `tap` you can highly improve a readability of your code. Moreover, `tap` returns self so you can chain another method after it.

### Wrapup

`itself` and `tap` are very useful methods. They are similar but usually are used for different purposes. Using both of them will make it possible to improve readability and maintainability of your code.

Code for this post you may find on [Github Gist](https://gist.github.com/veelenga/d35b6a2cd002de90f1a7).

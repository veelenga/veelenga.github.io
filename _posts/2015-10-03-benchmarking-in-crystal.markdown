---
layout: post
title: "Benchmarking in Crystal? It rocks!"
date: 2015-10-03T22:51:50+03:00
comments: true
excerpt: "Benchmarking in easy, benchmarking is existing, especially in Crystal! Checkout a quick overview with practical examples."
tags: [blog, blogging, crystal, crystallang, performance, benchmark, benchmarking, ips, benchmark-ips]
image:
  thumb: speed-up.jpg
published: true
---

<figure>
  <img src="/images/speed-up.jpg">
</figure>

Whether you are an experienced developer or a newbie, using programming language regularly or just learning it,
anyway, someday you will have few ways to code things and ask your self which implementation is faster,
which is more efficient and which should you use in your particular case.

<br>

Benchmarking usually helps to answer this questions, but a lot of people associate benchmarking with a lot of work.
Fortunately, in [Crystal](http://crystal-lang.org/) programming language benchmarking requires minimal effort with a great feedback.
It has a built-in module [Benchmark](http://crystal-lang.org/api/Benchmark.html),
which currently can work in two modes: compare tasks and measure time.
I think the most important part in code benchmarking is comparing tasks with each other,
so let's write a little example with [Benchmark.ips](http://crystal-lang.org/api/Benchmark.html#ips%28calculation%3D%3Cspanclass%3D%22n%22%3E5%3C%2Fspan%3E%2Cwarmup%3D%3Cspanclass%3D%22n%22%3E2%3C%2Fspan%3E%2Cinteractive%3D%3Cspanclass%3D%22t%22%3ESTDOUT%3C%2Fspan%3E.tty%3F%2C%26block%29-instance-method) method:

{% highlight ruby %}
# test.cr
arr = Array.new(1000, 1) # creates new array with 1000 ones

Benchmark.ips do |x|
  x.report("Array#[]" )  { arr[500]  }
  x.report("Array#[]?")  { arr[500]? }
end
{% endhighlight %}

Here we want to simply compare performance of two methods: [`Array#[]`](http://crystal-lang.org/api/Array.html#%5B%5D%28index%3AInt%29-instance-method) and [`Array#[]?`](http://crystal-lang.org/api/Array.html#%5B%5D%3F%28index%3AInt%29-instance-method).
Let's run our source file and see what happens:

{% highlight sh %}
$ crystal test.cr --release
 Array#[] 351.01M (± 2.15%)  1.12× slower
Array#[]? 392.77M (± 2.57%)       fastest
{% endhighlight %}

Report says that `Array#[]` 1.12x times slower then `Array#[]?`. Ah, how it is easy to benchmark, isn't it?

<br>

**Note**: according to the documentation, Crystal benchmarks should *always* be running with `--release` flag.
Never miss awesome optimizations of the compiler while benchmarking!

<br>

Let's look at more examples:

{% highlight ruby %}
# Int32#.to_s vs Interpolation
Benchmark.ips do |x|
  x.report("Int32#to_s")    { 100.to_s }
  x.report("Interpolation") { "#{100}" }
end
#Interpolation   8.46M (± 6.70%)  4.29× slower
#   Int32#to_s  36.31M (± 4.14%)       fastest
{% endhighlight %}

`Int32#to_s` is faster then interpolation when you just want to convert integer to string.
But with interpolation we also can perform a concatenation,
which is much more efficient then concatenation with `#to_s` method:

{% highlight ruby %}
# Interpolation vs Concatenation
Benchmark.ips do |x|
  x.report("Interpolation") { "#{100}:#{101}:#{102}" }
  x.report("Concatenation") { 100.to_s + ":" + 101.to_s + ":" + 100.to_s}
end
#Interpolation   6.15M (± 8.79%)       fastest
#Concatenation   4.61M (± 5.74%)  1.33× slower
{% endhighlight %}

But for really big strings we have to use [`String.build`](http://crystal-lang.org/api/String.html#build%28capacity%3D%3Cspanclass%3D%22n%22%3E64%3C%2Fspan%3E%2C%26block%29-class-method)
because of the benchmark:

{% highlight ruby %}
# String#+ vs String.build
n = 100_000
Benchmark.ips do |x|
  x.report("String#+") do
    s = ""
    n.times do |i|
      s += "#{i}"
    end
  end

  x.report("String.build") do
    String.build do |s|
      n.times do |i|
        s << i
      end
    end
  end
end
#    String#+   0.16  (± 0.00%) 1559.64× slower
#String.build 249.87  (±12.73%)         fastest
{% endhighlight %}

The next example has been taken from a [Fast Ruby](https://github.com/JuanitoFatas/fast-ruby)
- collection of common Ruby idioms. Of course, it was ported to Crystal:

{% highlight ruby %}
# Hash#fetch vs Hash#[] vs Hash#[]?
HASH_WITH_SYMBOL = { fast: "crystal" }
HASH_WITH_STRING = { "fast" => "crystal" }

Benchmark.ips do |x|
  x.report("Hash#[], symbol")    { HASH_WITH_SYMBOL[:fast]        }
  x.report("Hash#[]?, symbol")   { HASH_WITH_SYMBOL[:fast]?       }
  x.report("Hash#fetch, symbol") { HASH_WITH_SYMBOL.fetch(:fast)  }
  x.report("Hash#[], string")    { HASH_WITH_STRING["fast"]       }
  x.report("Hash#[]?, string")   { HASH_WITH_STRING["fast"]?      }
  x.report("Hash#fetch, string") { HASH_WITH_STRING.fetch("fast") }
end
#   Hash#[], symbol 130.06M (± 2.25%)  1.24× slower
#  Hash#[]?, symbol 161.42M (± 5.83%)       fastest
#Hash#fetch, symbol 125.95M (± 9.25%)  1.28× slower
#   Hash#[], string  88.75M (± 2.55%)  1.82× slower
#  Hash#[]?, string  97.72M (± 2.77%)  1.65× slower
#Hash#fetch, string  88.41M (± 2.48%)  1.83× slower
{% endhighlight %}

As expected `Hash#[]?` with symbols wins. Awesome!

<br>

There (in Fast Ruby) you may find a lot of good examples of tasks to compare and try it in Crystal.

## Wrapup

Next time you're considering which method is faster, set up and run a quick benchmark.
But you have to understand, benchmarking does not give you a complete picture about why your code might run slower,
but it gives you a good image about how your code is performing.
Happy benchmarking!

<br>

Source code for used examples you may found on [Github Gist](https://gist.github.com/veelenga/a5b861ccd32ff559b7d2).

<br>

All examples were run with Crystal **0.8.0**.


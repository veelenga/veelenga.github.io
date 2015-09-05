---
layout: post
title: "Make your own Shard in Crystal language"
date: 2015-09-06T21:11:25+03:00
comments: true
excerpt: "An easy to use tutorial to create a new shard in Crystal language."
tags: [crystal, crystal-lang, shard, shards, crystalshards, project, spec]
published: true
---

{% include _toc.html %}

## Introduction

[Crystal](http://crystal-lang.org ) is a young and perspective language. Currently it is in the alpha stage and only **0.7.7** release has been published. But the language is growing very quickly, more and more people are interested in Crystal. I believe it's a time to create a new popular **shard**. Shard is project written in Crystal, like a **gem** for Ruby or **crate** for Rust. The goal of this tutorial is to show you a simple and easy way to create and publish the new shard.

## Creating a Shard

To start a new project with Crystal use `crystal init` command:

{% highlight text %}
$ crystal init app hallo
      create  hallo/.gitignore
      create  hallo/LICENSE
      create  hallo/README.md
      create  hallo/.travis.yml
      create  hallo/Projectfile
      create  hallo/src/hallo.cr
      create  hallo/src/hallo/version.cr
      create  hallo/spec/spec_helper.cr
      create  hallo/spec/hallo_spec.cr
Initialized empty Git repository in /home/veelenga/dev/hallo/.git/
{% endhighlight %}

Here I'm passing `app` because I am making a binary program. If you want to make a library instead you have to use `crystal init` command with type `lib`. Run `crystal init -h` for more information.

<br>

Let's print out again what was generated for us:

{% highlight text %}
$ cd hallo
$ tree .
.
├── LICENSE
├── Projectfile
├── README.md
├── spec
│   ├── hallo_spec.cr
│   └── spec_helper.cr
└── src
    ├── hallo
    │   └── version.cr
    └── hallo.cr

3 directories, 7 files
{% endhighlight %}

At the root of your project directory is placed `Projectfile` file. This is where you will declare your project dependencies. We will talk about it a bit later in [Adding dependencies](#adding-dependencies) section.

<br>

`spec` directory is used for testing your sources. Crystal has it's own built-in testing library called `Spec` and it is very similar to Ruby's [Rspec](http://rspec.info/). We will write tests for our project in [Writing tests](writing-tests) section.

<br>

Code for your package is placed inside the `src` directory and it has the same convention as for Ruby project: one Crystal file with the *same* name as your shard. Other project related files are placed inside `src/hallo/` directory (currently there is only `version.cr`).

<br>

Let's add some code to let our shard be able to say "Hello" to the world. Here is how `src/hallo.rb` looks after update:

{% highlight ruby %}
require "./hallo/*"

module Hallo
  def self.say_hi
    puts "Hello, world!"
  end
end
{% endhighlight %}

Now we can build our file and check whether it compiles or not:

{% highlight text %}
$ crystal build src/hallo.cr
{% endhighlight %}

If compiler successfully compiles our file, you will have a new executable file `hallo` in your root directory. Let's try and run it:

{% highlight text %}
$ ./hallo
{% endhighlight %}

Nothing was printed. Why ? Because our executable only defines a new module and a method inside and we do not call it. Let's create a real executable and print to the console "Hello, world!".

### Adding an executable

Currently Crystal does not have a convention where to place executable files. So, we're going to create a new file in `bin/` directory. I believe that is the best place for our executable. Let's create `bin/hallo` with the following content:

{% highlight ruby %}
require "../src/hallo"

Hallo.say_hi
{% endhighlight %}

Let's build our executable and then run it:

{% highlight text %}
$ crystal build bin/hallo
$ ./hallo
Hello, world!
{% endhighlight %}

Congratulations, we have been just created our fancy Crystal shard and we are able to run it. Awesome!

### Adding dependencies

Shards wouldn't be so useful if there weren't a way to easily reuse it in your project. Fortunately, Crystal has a built-in mechanism to add dependencies. Let's make our project dependent on [emoji.cr](https://github.com/veelenga/emoji.cr) shard that is able to emojize strings.

<br>

Firstly, we need to add a dependency to our `Projectfile`:

{% highlight ruby %}
deps do
  github "veelenga/emoji.cr"
end
{% endhighlight %}

Secondly, we need to load our dependencies with `crystal deps` command:

{% highlight text %}
$ crystal deps
Cloning into '.deps/veelenga-emoji.cr'...
remote: Counting objects: 155, done.
remote: Total 155 (delta 0), reused 0 (delta 0), pack-reused 155
Receiving objects: 100% (155/155), 29.15 KiB | 0 bytes/s, done.
Resolving deltas: 100% (52/52), done.
Checking connectivity... done.
{% endhighlight %}

It will clone defined dependencies to `.deps/` directory and create a symbolic links in `libs/` directory to sources:
{% highlight text %}
$ ls -gho libs
lrwxrwxrwx 1 30 Sep  6 12:33 emoji -> ../.deps/veelenga-emoji.cr/src
{% endhighlight %}

Let's now use **emoji** shard in our project. Rewrite `src/hallo.cr` to the following:

{% highlight ruby %}
require "./hallo/*"
require "emoji"

module Hallo
  def self.say_hi
    say("Hello, world :exclamation:")
  end

  def self.say(message: String)
    Emoji.emojize(message)
  end
end
{% endhighlight %}

On the second line we *require* emoji shard and then use it to emojize a message.
Let's also rewrite a `bin/hallo` executable file:

{% highlight ruby %}
require "../src/hallo"

if ARGV.empty?
  # say hi if no arguments passed
  puts Hallo.say_hi
else
  puts Hallo.say(ARGV.first)
end
{% endhighlight %}

Here we want to print a custom message if user passes it to the executable via command line, and print default message ("Hello, world!") if nothing was passed. Let's build and run it:


{% highlight text %}
$ crystal build bin/hallo
$ ./hallo
Hello, world ❗
$ ./hallo "I :heart: Crystal"
I ❤️ Crystal
{% endhighlight %}

We can see that our binary works as expected and emoji shard emojizes our string. Looks easy, right? It's time to add some tests.

## Writing tests

Writing tests for your shard is very important. It will ensure that your code works, help you to be assured that your change does not break something and help others to know that your shard does it's job. Actually, tests are a good place to view how your project works in details.

<br>

You may say that using BDD (or TDD) practice we have to write our tests first. And you will be completely correct. But, usually, it is much easier to understand a tutorial writing code first and then tests.

<br>

Crystal has it's own built-in testing library called `Spec`. Let's add basic tests for our module:

{% highlight ruby %}
require "./spec_helper"

describe Hallo do
  describe ".say_hi" do
    it "returns default message" do
      Hallo.say_hi.should eq "Hello, world ❗"
    end
  end

  describe ".say" do
    it "returns emojizes message if there are emojies" do
      Hallo.say("Hello, smiling cat :smile_cat:")
        .should eq "Hello, smiling cat 😸"
    end

    it "returns original message if there is no emojies" do
      Hallo.say("Hello!").should eq "Hello!"
    end
  end
end
{% endhighlight %}

We can run tests with `crystal spec` command:

{% highlight text %}
$ crystal spec
...

Finished in 1.27 milliseconds
3 examples, 0 failures, 0 errors, 0 pending
{% endhighlight %}

To test your project on Travis CI, here is a sample `.travis.yml` file:

{% highlight yaml %}
language: crystal
{% endhighlight %}

It has been already generated with `crystal init` command. Just add it to you project if you haven't done it already.

<br>

Now we can write tests and test our shard on Travis. Awesome! It's a time to document our code.

## Documenting your code

Crystal supports a markdown syntax. Let's add some documentation with examples:

{% highlight ruby %}
require "./hallo/*"
require "emoji"

# The main Hallo module
module Hallo
  # Says hi to the world!
  #
  # ```
  # Hallo.say_hi #=> "Hello, world ❗"
  # ```
  def self.say_hi
    say("Hello, world :exclamation:")
  end

  # Says a message to the world.
  # Supports emojization.
  #
  # ```
  # Hallo.say("I :heart: Crystal") #=> I ❤️ Crystal
  # ```
  def self.say(message: String)
    Emoji.emojize(message)
  end
end
{% endhighlight %}

After that we can generate documentation locally with `crystal docs` command:

{% highlight text %}
$ crystal docs
{% endhighlight %}

It will generate documentation in `doc` folder. Just open `doc/index.html` in your browser and review a pretty formatted documentation of you shard. Looks easy!

## Wrapup

This is a simple and easy to use tutorial that shows how to create the new shard in Crystal language, add an executable, dependencies, write tests and document a code. I hope you are full of ideas for a new projects and you are on the way to make a new shard. Crystallians are waiting for you!


### Credits
This tutorial was inspired by [Make your own gem](http://guides.rubygems.org/make-your-own-gem/) guide at RubyGems.org.
Source code for this shard can be found [on Github](http://github.com/veelenga/hallo).

### Available Shards
The best place to learn how to create a new shard is to look at the existed ones. The list of all available shards you may find at [Crystalshards](http://crystalshards.herokuapp.com) and the most popular and useful projects are at [Awesome Crystal](http://awesome-crystal.com).
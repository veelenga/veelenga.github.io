---
title: "Make your own Shard in Crystal language"
date: 2015-09-06T21:11:25+03:00
modified: 2016-01-03
excerpt: "An easy to use tutorial to create a new shard in Crystal language."
tags:
  - crystal-lang
  - infrastructure
published: true
---

{% include toc title="On this page" icon="file-text-o" %}

## Introduction

[Crystal](http://crystal-lang.org ) is a young and perspective language. Currently it is in the alpha stage but the language is growing very quickly, more and more people are interested in Crystal. I believe it's a time to create a new popular **shard**. Shard is a project written in Crystal, like a **gem** for Ruby or **crate** for Rust. The goal of this tutorial is to show you a simple and easy way to create and publish the new shard.

## Creating a Shard

To start a new project with Crystal use `crystal init` command:

{% highlight text %}
$ crystal init app hallo
      create  hallo/.gitignore
      create  hallo/LICENSE
      create  hallo/README.md
      create  hallo/.travis.yml
      create  hallo/shard.yml
      create  hallo/src/hallo.cr
      create  hallo/src/hallo/version.cr
      create  hallo/spec/spec_helper.cr
      create  hallo/spec/hallo_spec.cr
Initialized empty Git repository in /home/veelenga/dev/hallo/.git/
{% endhighlight %}

Here I'm passing `app` argument to `crystal init` command because I am making a binary program. If you want to make a library instead you have to use `crystal init` command with type `lib`. Run `crystal init -h` for more information.

Let's print out again what was generated for us:

{% highlight text %}
$ cd hallo
$ tree .
.
├── LICENSE
├── README.md
├── shard.yml
├── spec
│   ├── hallo_spec.cr
│   └── spec_helper.cr
└── src
    ├── hallo
    │   └── version.cr
    └── hallo.cr

3 directories, 7 files
{% endhighlight %}

At the root of your project directory is placed `shard.yml` file. This is where you will declare your project dependencies. We will talk about it a bit later in [Adding dependencies](#adding-dependencies) section.

`spec` directory is used for testing your sources. Crystal has it's own built-in testing library called `Spec` and it is very similar to Ruby's [Rspec](http://rspec.info/). We will write tests for our project in [Writing tests](#writing-tests) section.

Code for your package is placed inside the `src` directory and it has the same convention as for Ruby project: one Crystal file with the *same* name as your shard. Other project related files are placed inside `src/hallo/` directory (currently there is only `version.cr`).

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

Nothing was printed. Why? Because our executable only defines a new module and a method inside and we do not call it. Let's create a real executable and print to the console "Hello, world!".

### Adding an executable

Currently Crystal does not have a convention where to place executable files. Let's add it to the root directory. Create `./greeter.cr` file with the following content:

{% highlight ruby %}
require "./src/*"

Hallo.say_hi
{% endhighlight %}

Let's build our executable and then run it again:

{% highlight text %}
$ crystal build greeter.cr
$ ./greeter
Hello, world!
{% endhighlight %}

Awesome, we can run it. But the real project can be big and it could not be so easy to build or run it. So, somewhere we need to define rules that our project requires to be build to simplify a life for other developers or project's users. This is where `Makefile` comes. Here is a tiny example:

{% highlight sh %}
OUT_DIR=bin

all: build

build:
	mkdir -p $(OUT_DIR)
	crystal build --release greeter.cr -o $(OUT_DIR)/greeter

run:
	$(OUT_DIR)/greeter

clean:
	rm -rf  $(OUT_DIR) .crystal .deps libs
{% endhighlight %}

In our `Makefile` we build our `greeter.cr` with `--release` flag that is extremely important for production applications. `-o $(OUT_DIR)/greeter` defines a destinations file, in our example it is `bin/greeter`. Let's build it:

{% highlight text %}
$ make build
mkdir -p bin
crystal build --release greeter.cr -o bin/greeter
{% endhighlight %}

After running this command `bin/greeter` file should have been created. Run it with:

{% highlight text %}
$ make run
bin/greeter
Hello, world!
{% endhighlight %}

Congratulations, we have been just created our fancy Crystal shard and we are able to build and run it. Awesome!

### Adding dependencies

Shards might not be so useful if there wouldn't a way to easily reuse it in your project. Fortunately, Crystal is integrated with [shards](https://github.com/crystal-lang/shards) project to manage project dependencies. Follow the instructions to install it at the beginning. And then let's make our project dependent on [emoji.cr](https://github.com/veelenga/emoji.cr) shard that is able to emojize strings.

Firstly, we need to add a dependency to our `shard.yml` file:

{% highlight yaml %}
...
dependencies:
  emoji:
    github: veelenga/emoji.cr
    branch: master
...
{% endhighlight %}

Secondly, we need to load our dependencies with `crystal deps` command:

{% highlight text %}
$ crystal deps
Updating https://github.com/veelenga/emoji.cr.git
Installing emoji (master)
{% endhighlight %}

It will clone defined dependencies to `.shards/` directory. Let's now use **emoji** shard in our project. Rewrite `src/hallo.cr` to the following:

{% highlight ruby %}
require "./hallo/*"
require "emoji"

module Hallo
  def self.say_hi
    say("Hello, world :exclamation:")
  end

  def self.say(message : String)
    Emoji.emojize(message)
  end
end
{% endhighlight %}

On the second line we *require* emoji shard and then use it to emojize a message.
Let's also rewrite a `./greeter.cr` executable file:

{% highlight ruby %}
require "./src/*"

if ARGV.empty?
  # say hi if no arguments passed
  puts Hallo.say_hi
else
  puts Hallo.say(ARGV.first)
end
{% endhighlight %}

Here we want to print a custom message if user passes it to the executable via command line, and print default message ("Hello, world!") if nothing was passed. Let's build and run it:

{% highlight text %}
$ make build
$ ./bin/greeter
Hello, world ❗
$ ./bin/greeter "I :heart: Crystal"
I ❤️ Crystal
{% endhighlight %}

We can see that our binary works as expected and emoji shard has been successfully used as a dependency. Looks easy, right? It's time to add some tests.

## Writing tests

Writing tests for your shard is very important. It will ensure that your code works, help you to be assured that your change does not break something and help others to know that your shard does it's job. Actually, tests are a good place to view how your project works in details.

You may say that using BDD (or TDD) practice we have to write our tests first. And you will be completely correct. But, usually, it is much easier to understand a tutorial writing code first and then tests.

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
    it "returns emojized message if there are emojies" do
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

Now we can write tests and test our shard on Travis. Awesome! It's a time to document our code.

## Documenting your code

Crystal documentation supports a markdown syntax. Let's add some docs with examples:

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
  def self.say(message : String)
    Emoji.emojize(message)
  end
end
{% endhighlight %}

After that we can generate documentation locally with `crystal docs` command:

{% highlight text %}
$ crystal docs
{% endhighlight %}

It will generate documentation in `doc` folder. Just open `doc/index.html` in your browser and review a pretty formatted documentation of your shard. Looks easy!

## Wrapup

This is a simple and easy to use tutorial that shows how to create the new shard in Crystal language, add an executable, dependencies, write tests and document a code. I hope you are full of ideas for new projects and you are on the way to make a new shard. Crystallians are waiting for you!


### Credits
This tutorial was inspired by [Make your own gem](http://guides.rubygems.org/make-your-own-gem/) guide at RubyGems.org.
Source code for this shard can be found [on Github](http://github.com/veelenga/hallo).

### Available Shards
The best place to learn how to create a new shard is to look at the existed ones. The list of all available shards you may find at [Crystalshards](http://crystalshards.xyz/) and the most popular and useful projects are at [Awesome Crystal](http://awesome-crystal.com).

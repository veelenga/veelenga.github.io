---
layout: post
title: "How to Run Long Running Crystal Specs in Vim"
modified:
excerpt: Running long specs for your project within Vim? Then this short article is for you.
tags: [crystal, vim, spec, crystallang, test]
date: 2015-10-16T07:42:00+03:00
comments: true
---

[vim-crystal](https://github.com/rhysd/vim-crystal) is a great plugin, it brings a lot of stuff
that helps us to work with most all Crystal's features.
[Spec](http://crystal-lang.org/api/Spec.html) is one of those features. It is pretty easy
to run specs for your project with a quick shortcut within vim.
But it could be painful if you have a long running specs, because
your editor will freeze and you will have to wait until all specs finish.
What can we do ?

<br>

[vim-dispatch](https://github.com/tpope/vim-dispatch) is another cool vim plugin that will help.
Just use a `:Dispatch` command.
Here is an example of running specs in Crystal sources:

<figure>
  <img src="/images/crystal-spec-dispatch.gif">
</figure>

And if you want to run long specs for your Crystal project with standard structure, just type `:Dispatch crystal spec`.
Cheers!

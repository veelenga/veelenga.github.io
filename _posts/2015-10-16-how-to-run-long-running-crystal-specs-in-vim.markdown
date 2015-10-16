---
layout: post
title: "How to Run Long Running Crystal Specs in Vim"
modified:
excerpt: Running specs withing a Vim someday could be a pain. This short post is about how to deal with long running Crystal specs in Vim.
tags: [crystal, vim, spec, crystallang, test]
date: 2015-10-16T07:42:00+03:00
comments: true
---

There is a nice plugin [vim-crystal](https://github.com/rhysd/vim-crystal) that brings a lot of stuff
that helps us to work with most all Crystal's features.
Crystal [Spec](http://crystal-lang.org/api/Spec.html) is one of such features. It is pretty easy
to run specs for your project with a shortcut
`gsa`. But everybody knows that vim has issues with async operations.
And if you have a long running specs, your editor will freeze and you will wait until all specs finish.
What can we do ?

<br>

[vim-dispatch](https://github.com/tpope/vim-dispatch) is another cool vim plugin that will help.
Just run your long running specs with a `:Dispatch {your command to run specs}` command.
Here is an example of running specs in Crystal sources:

<figure>
  <img src="/images/crystal-spec-dispatch.gif">
</figure>

And yeah, to run long specs for your Crystal project just type `:Dispatch crystal spec`. Cheers!

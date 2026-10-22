---
title: "How to run long-running Crystal specs in Vim"
image: /images/og/how-to-run-long-running-crystal-specs-in-vim.png
description: "How to run long-running Crystal specs in Vim without freezing the editor, using the vim-crystal and vim-dispatch plugins and the :Dispatch command."
excerpt: Running long specs for your project within Vim? Then this short article is for you.
tags:
  - crystal
  - neovim
date: 2015-10-16T07:42:00+03:00
---

[vim-crystal](https://github.com/rhysd/vim-crystal) is a great plugin, it brings a lot of stuff
that helps us to work with most all Crystal's features.
[Spec](http://crystal-lang.org/api/Spec.html) is one of those features. It is pretty easy
to run specs for your project with a quick shortcut within vim.
But it could be painful if you have a long running specs, because
your editor will freeze and you will have to wait until all specs finish.
What can we do ?

[vim-dispatch](https://github.com/tpope/vim-dispatch) is another cool vim plugin that will help.
Just use a `:Dispatch` command.
Here is an example of running specs in Crystal sources:

<figure>
  <video autoplay muted loop playsinline width="796" height="574" poster="/images/crystal-spec-dispatch-poster.jpg" aria-label="Crystal specs running in the background from Vim with vim-dispatch">
  <source src="/images/crystal-spec-dispatch.mp4" type="video/mp4">
</video>
</figure>

And if you want to run long specs for your Crystal project with standard structure, just type `:Dispatch crystal spec`.
Neovim also runs jobs in the background out of the box, and a related post shows [how to switch to it from Vim](/editors/how-to-start-using-neovim-instead-of-vim/).
Cheers!

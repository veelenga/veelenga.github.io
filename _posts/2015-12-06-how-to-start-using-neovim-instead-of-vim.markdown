---
title: "How to start using Neovim instead of Vim"
modified:
categories: [editors]
excerpt: Step by step tutorial how to start using Neovim with Vim's config.
tags: [neovim, vim, infrastructure]
image:
  thumb: logos/neovim.png
date: 2015-12-06T17:05:49+02:00
---

In this article I want to show you how to start using [Neovim](https://neovim.io/) instead of Vim with a minimum effort.
If you haven't heard about Neovim or don't understand why it might be useful for you, read
[Why Neovim is better than Vim](http://geoff.greer.fm/2015/01/15/why-neovim-is-better-than-vim/) blogpost first.

Actually, Neovim is compatible with almost all Vim's features, so in most cases you will be able to use both editors with the same configuration.

<figure>
  <img src="/images/neovim-ui.gif">
</figure>

## Installation

The easiest way to install Neovim on OS X is with `brew`:

{% highlight sh %}

$ brew install neovim/neovim/neovim

{% endhighlight %}

If you need to install it without `brew` or your OS is different, refer to
an official [wiki](https://github.com/neovim/neovim/wiki/Installing-Neovim) for instructions.

Run Neovim from the console with `nvim` command after installation succeeds.

## Linking configuration

Neovim uses `~/.config/nvim/init.vim` configuration file (like `.vimrc` for Vim) and `~/.config/nvim/` directory (like `~/.vim/`).
So, to just start using existed Vim configuration you have to link those files as follows:

{% highlight sh %}

$ ln -s ~/.vim ~/.config/nvim
$ ln -s ~/.vimrc ~/.config/nvim/init.vim

{% endhighlight %}

At this point you have to try to run Neovim again to be sure that it is compatible with existed configuration.
If something fails, you will need to temporary disable it (unload a plugin or comment an option) to prevent any errors.

A full set of differences between Vim and Neovim features you can find [here](https://neovim.io/doc/user/vim_diff.html#vim-differences).

## Python support

If you want support for Python plugins such as [YouCompleteMe](https://github.com/Valloric/YouCompleteMe),
you need to install a Python module in addition to Neovim itself.

Installation depends on which version of python you need. But, in general, it is as simple as:

{% highlight sh %}

$ pip install neovim

{% endhighlight %}

If you need any customization you may refer to the official [documentation](https://neovim.io/doc/user/nvim_python.html).

If the problem with existed plugins was an absence of python, it's a time to re-enable it.

## Graphical Interface

If you prefer using GVim instead of Vim, you would love [Neovim-dot-app](https://github.com/rogual/neovim-dot-app). It looks
almost the same as Graphical Vim, but unfortunately, available only for OS X.

Installation with `brew` is very simple:

{% highlight sh %}

$ brew tap rogual/neovim-dot-app
$ brew install --HEAD neovim-dot-app

{% endhighlight %}

## Fixing configuration issues

If your Vim's configuration includes inconsistent with Neovim options, to stay backward compatible with Vim,
I will suggest to set such options conditionally, for example:

{% highlight sh %}

if !has('nvim')
  set ttymouse=xterm2
endif

{% endhighlight %}

If at this point you still have issues with a configuration (Neovim shows an error at startup or won't start or some features do not work),
unfortunately, you have to read documentation, search a solution on the internet or ask a development team for help.

If you faced with (or solved) such kind of issue, please post a comment below. This might help somebody in future.

## Further investigation/configuration

After all is set up, you have to try the power of Neovim. The following resources might be useful for further investigation:

* [Neovim feature reference](https://neovim.io/doc/user/nvim.html)
* [Related projects, API clients, plugins etc.](https://github.com/neovim/neovim/wiki/Related-projects)
* [Terminals in Neovim](http://ryanselk.com/2015/05/19/terminals-in-neovim/)
* [Neovim Remote Plugin](https://neovim.io/doc/user/remote_plugin.html)

---
title: "Getting started with Unite.vim"
modified:
categories:
  - editors
excerpt: Initial configuration of Unite.vim after installation.
tags:
  - neovim
  - infrastructure
image:
  feature:
date: 2015-12-15T10:16:04+02:00
---

I found [Unite.vim](https://github.com/Shougo/unite.vim) as a very very powerful plugin.
It has replaced few plugins I have been using before. Installation of the unite.vim does
not bring us any mappings and requires some initial configuration.

You may start with adding mappings for most usable features:

{% highlight vim %}

nnoremap <C-P>    :Unite -buffer-name=files -start-insert file_rec/async:!<cr>
nnoremap <space>/ :Unite -no-empty -no-resize grep<cr>
nnoremap <space>s :Unite -quick-match buffer<cr>

{% endhighlight %}

Now, if you press `<C-P>` you will have a file search window similar to [CtrlP](https://github.com/kien/ctrlp.vim) plugin search.
With `<space>/` asynchronous grep through content in files and with `<space>s` a search through buffers. And, actually, it is amazing.

You can go further and add few useful mappings in unite window for navigation and window opening:

{% highlight vim %}
autocmd FileType unite call s:unite_settings()
function! s:unite_settings()
  imap <buffer> <C-j> <Plug>(unite_select_next_line)
  imap <buffer> <C-k> <Plug>(unite_select_previous_line)

  nmap <silent><buffer><expr> Enter unite#do_action('switch')
  nmap <silent><buffer><expr> <C-t> unite#do_action('tabswitch')
  nmap <silent><buffer><expr> <C-h> unite#do_action('splitswitch')
  nmap <silent><buffer><expr> <C-v> unite#do_action('vsplitswitch')

  imap <silent><buffer><expr> Enter unite#do_action('switch')
  imap <silent><buffer><expr> <C-t> unite#do_action('tabswitch')
  imap <silent><buffer><expr> <C-h> unite#do_action('splitswitch')
  imap <silent><buffer><expr> <C-v> unite#do_action('vsplitswitch')

  map <buffer> <C-p> <Plug>(unite_toggle_auto_preview)

  nnoremap <ESC> :UniteClose<cr>
endfunction
{% endhighlight %}

Now you can navigate through files in Unite window with `<C-j>` and `<C-k>` and open files in a new tab,
horizontal split window or vertical split window with `<C-t>`, `<C-h>` and `<C-v>` in accordance. Pretty useful.

Also you are able to customize a window position, size, preview settings etc. with profiles:

{% highlight vim %}
call unite#custom#profile('default', 'context', {
\   'direction': 'botright',
\   'vertical_preview': 1,
\   'winheight': 15
\ })
{% endhighlight %}

It is awesome!

Unite.vim is very powerful. It is able to do a lot of stuff for everyday usage.
And with a proper configuration it becomes an indispensable plugin.

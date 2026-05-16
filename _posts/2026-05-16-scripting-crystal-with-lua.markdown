---
title: "Crystal meets Lua: how two languages share a stack"
date: 2026-05-16T10:00:00+02:00
categories:
excerpt: A visual walkthrough of how Crystal and Lua work together — and the surprisingly small data structure that quietly makes it all possible.
tags:
  - crystal-lang
  - lua
  - ffi
  - bindings
published: true
---

This post walks through how Crystal and Lua run inside the same program and talk to each other, and the small, clever data structure that makes the whole thing work.

The concrete tool we'll use is [lua.cr](https://github.com/veelenga/lua.cr), a Crystal shard I built that wraps the Lua 5.4 C API. No prior knowledge of it is needed — the focus here is on the idea, not the syntax. Once the idea clicks, the code stops looking strange.

## The Lua stack

Lua isn't really meant to be used on its own. It was designed to be **embedded**, meaning it can be dropped into a host program (in our case a Crystal app) so that the host can be configured, scripted, or extended without recompiling. That's why Lua scripts run inside Redis, inside Neovim, inside World of Warcraft. Same Lua, different hosts.

To make that work, Lua needs a way to exchange values with whatever language is hosting it. It can't just share memory: the host and Lua have different type systems, different garbage collectors, different ideas of what an object even is. So Lua picked the simplest thing that could work: **a stack**.

The host puts values on the stack. Lua reads values off the stack. When a function call needs to happen, both sides agree to leave the inputs and outputs on the stack. That's the whole protocol.

Here's what one full round-trip looks like — Crystal calling a Lua function `sum(3, 5)` and getting `8` back:

![Calling sum(3, 5) through the Lua stack](/images/lua-cr/stack-animation.svg)

Watching the middle column reveals the whole conversation: things appear, the `CALL` happens, things rearrange, and a result pops out. Nothing else moves between Crystal and Lua. Just the stack.

Now let's slow that down and look at each step.

### Step 1. Crystal places things on the counter

![Crystal has pushed the function and its arguments](/images/lua-cr/frame-1-push.svg)

Crystal wants to call `sum(3, 5)`. To set that up, it does three pushes, in order:

1. **The function itself.** In Lua, a function is just a value, like a number or a string — it can sit on the stack the same way. It goes on first, at the bottom.
2. **The first argument**, `3`.
3. **The second argument**, `5`.

Notice we never said "this is a function call with two arguments." We didn't need to. The shape of the stack already says everything: the bottom-most item is the function, the items above it are the arguments in order, the topmost item is the last argument. No extra "argument count," no struct, no array — the stack itself tells how many things are there and in what order.

### Step 2. The handoff

![Lua takes the args off and runs](/images/lua-cr/frame-2-call.svg)

Crystal now says: **"call this, with 2 arguments."**

Lua takes over. It peels the two arguments off the top — the very top becomes `y`, the one below becomes `x` — and the function underneath them gets activated. From Lua's point of view this is just a normal function call; its arguments magically appeared as local variables.

The function runs:

```lua
function sum(x, y)
  return x + y
end
```

Lua computes `x + y = 8` and is about to return. But there's only one place where it can leave the result: back on the stack.

### Step 3. The result

![Lua left 8 on the stack; Crystal pops it](/images/lua-cr/frame-3-result.svg)

Lua clears out the function and its two arguments — they've been consumed — and puts `8` where they used to be. The call is over. The stack is one item tall again. Crystal reads the top, sees `8`, and pops it off.

That's the entire round-trip. Three pushes, one call, one pop.

## A small aside: how does a function get on the stack?

We glossed over one thing. We said "push the function `sum`," but a function isn't something Crystal can hand to Lua the way it hands over the number `3`. Lua functions live inside Lua — Crystal never holds one directly.

So how does `sum` end up on the stack? Usually one of two ways:

- **Loading a chunk of Lua source.** When Crystal asks Lua to compile something like `function sum(x, y) return x + y end return sum`, Lua creates the function and leaves it on top of the stack. Crystal then gets a small ticket for it — a number Lua remembers — and can use that ticket later to put the same function back on the stack.
- **Looking it up by name.** If the function already exists in Lua (because it was defined earlier), Crystal can ask Lua to fetch `sum` by name, which puts the function on top of the stack.

Either way, the pattern is the same: Lua owns the function, the stack is how it gets handed back and forth, and Crystal only ever holds a ticket to it. The same goes for tables, strings, anything that isn't a plain number or boolean — Crystal works through the stack, never with Lua's raw data.

This is why the stack matters so much: it's not just where arguments go, it's the *only* place Crystal can touch anything that lives inside Lua.

## Why this works so well

It's a clever little design once it clicks:

- **No shared memory layout.** Each language only knows how to push and read from the stack, not how the other side stores values.
- **The protocol works both ways.** When Lua calls back into Crystal (which happens when a Lua script invokes a method on an exposed Crystal object), Lua pushes the arguments, Crystal reads them off, runs, and pushes the result. Exactly the same dance, just in reverse.
- **Counting is free.** "How many things did the caller pass?" is just "how tall is the stack now compared to before?"
- **Errors are easy.** If something blows up, Lua can unwind the stack, push an error message where the result would have been, and the caller will find it.
- **Memory ownership is clear.** Once a value lands on the stack, Lua owns it. The host doesn't have to worry about it.

This same trick is used by [Python's C API](https://docs.python.org/3/c-api/), [the JVM's JNI](https://docs.oracle.com/javase/8/docs/technotes/guides/jni/), and basically every "embed a scripting language in my program" story. Lua just makes it especially small and especially obvious.

## But wait — why not just write `sum` in Crystal?

Calling a two-line `sum` function through three pushes and a call is obviously overkill. Nobody embeds Lua to add numbers. The point is what becomes possible once the bridge exists:

- **Configuration that's actually programmable.** Some things are too dynamic for YAML. A trading rule, an alert condition, a routing decision — these are tiny programs. Shipping them as Lua means they can change without recompiling the Crystal binary or even restarting the process.
- **User-supplied logic.** Game scripting is the classic example. Designers write NPC behavior, quest logic, and UI rules in Lua while the engine itself stays in a fast compiled language. Same pattern in Neovim plugins, WoW addons, and Redis server-side scripts.
- **Hot reload without redeploys.** Lua chunks can be loaded, replaced, and reloaded at runtime. A long-running Crystal service can pick up new logic without restarting.
- **Safer extension points.** Lua is small enough to sandbox. A script can compute and decide, but it doesn't get to open arbitrary files or shell out unless the host explicitly hands it those abilities.
- **A friendlier scripting layer for non-programmers.** Lua is much smaller than Crystal — a few operators, a handful of types, no compile step. People who'd be lost in a systems language can get useful work done in Lua in an afternoon.

The Crystal side keeps doing what Crystal is good at: fast, typed, compiled code. The Lua side does what Lua is good at: small, soft, changeable scripts. The stack is the bridge between them.

## What this looks like in Crystal

I built [lua.cr](https://github.com/veelenga/lua.cr) as a thin Crystal wrapper around this exact protocol. The class is literally called `Lua::Stack`, and pushing values uses `<<`:

{% highlight ruby %}
require "lua"

lua = Lua.load

lua << 42
lua << "lua"
lua << true

puts lua.size  # => 3
puts lua.pop   # => true
puts lua.pop   # => "lua"
puts lua.pop   # => 42

lua.close
{% endhighlight %}

The whole `sum(3, 5)` round-trip from the animation, in actual Crystal code:

{% highlight ruby %}
lua = Lua.load
sum = lua.run %q{
  function sum(x, y)
    return x + y
  end
  return sum
}

puts sum.as(Lua::Function).call(3, 5)  # => 8
lua.close
{% endhighlight %}

`Function#call` does exactly what the animation showed: push the function, push the arguments, ask Lua to call, read the result off the top.

## Wrap-up

When two languages need to talk inside the same process and they can't share memory directly, the simplest thing that works is to give them a stack — a tiny shared counter where one side puts things and the other side picks them up.

That's the whole idea behind every Lua embedding, including `lua.cr`. Once the stack clicks, the rest of the API stops feeling like magic and starts feeling like exactly what it is: a polite handoff between two worlds that have agreed to meet in the middle.

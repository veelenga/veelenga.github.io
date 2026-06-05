---
title: "Autonomous agents that sleep"
date: 2026-06-05T10:00:00+02:00
excerpt: "The obvious way to build an autonomous agent is a loop that runs until the work is done. It demos beautifully and falls apart the moment the agent has to wait. The fix is to turn the loop inside-out, and what's left looks a lot more like sleep."
tags:
  - ai
  - agents
  - claude
  - system design
published: true
---

The obvious way to build an autonomous agent is a loop: call the model, let it act, check whether the work is done, and go around again until it is. It looks great in a demo, right up until the first time the agent has to *wait*, whether for a slow CI build, for a human review, or for anything it doesn't control. A loop has nothing useful to do while it waits, and it can't be reached while it spins.

There's a better shape. It looks less like a loop and more like sleep: do one short turn, report what happened, and stop. Something *outside* the agent holds the state, waits, and starts the next turn only when the world actually changes.

![An autonomous agent's lifecycle: it does one turn, reports a status line, goes idle, and is woken by an event from the world, then repeats.](/images/autonomous-agents-that-sleep/lifecycle.svg)

The examples here use Anthropic's [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview), which exposes a single `query()` call that runs a full agent turn for us. But the idea is the SDK-agnostic part. It's about where the loop lives, not which library runs it.

## The loop that never ends

A loop is the first thing anyone reaches for, and for a one-shot task it's exactly right: keep going until the answer is good enough. The shape only breaks once the task crosses something the agent can't finish on its own, like opening a pull request and needing it to go green.

![The naive loop: call the model, act, check if CI is green, and loop back to wait when it isn't. Three failure modes: it burns budget polling, it can't be steered mid-loop, and a crash loses all progress.](/images/autonomous-agents-that-sleep/naive-loop.svg)

Now the loop has to wait for a build that takes twelve minutes, and three problems show up at once. It **burns budget** sitting in the loop, re-asking the model whether CI is done yet. It **can't be steered**: a new instruction has nowhere to land until the loop comes back around to check. And if the process dies, it suffers total **amnesia**, because the loop's progress lived in memory, so a restart begins from nothing.

The root cause is the same in all three. The durable, long-lived part of the system is *inside* the agent's loop, where it's expensive to run, hard to interrupt, and easy to lose.

## Turn the loop inside-out

So we move it out. The loop becomes a small, ordinary program (call it the **controller**) that lives outside the agent and owns everything durable: which session is in flight, which pull requests are open, what's still pending. The agent is no longer a long-running thing. It's a function the controller calls for one turn at a time.

![The controller, an always-on process, holds the durable state and receives events from the world. For each event it spawns a single stateless agent turn, which does the work, returns a status line, and exits.](/images/autonomous-agents-that-sleep/architecture.svg)

Events from the world arrive at the controller, not the agent: a CI result, a review comment, a new ticket, a person stepping in to redirect. The controller decides what they mean, spawns a turn to handle them, records the outcome, and goes quiet again. A turn is genuinely short-lived. It spins up, does its work, and exits, leaving nothing running behind it.

In the Claude Agent SDK, that turn is one `query()` call we drain to the end:

{% highlight javascript %}
import { query } from '@anthropic-ai/claude-agent-sdk';

// One turn: hand the agent a prompt, let it work, collect what it did. Then it's over.
async function runTurn(prompt, options) {
  let sessionId, reply;
  for await (const msg of query({ prompt, options })) {
    if (msg.type === 'system' && msg.subtype === 'init') sessionId = msg.session_id;
    if (msg.type === 'result') reply = msg.result;
  }
  return { sessionId, reply };
}
{% endhighlight %}

## A turn never waits

This is the one rule that makes the whole thing hold together: **a turn does its work and ends. It never waits.** After the agent pushes a branch or opens a pull request, it stops. It does not poll CI. It does not sleep for twelve minutes. It does not block on a review.

In practice the rule lives in the agent's own instructions, in plain words:

> After pushing or opening a pull request, end the turn. Never wait, sleep, or poll for CI. Results and review comments arrive as new events that wake the next turn.

A good teammate works the same way. They don't stand around watching a progress bar fill; they push the change, say "I'll pick it back up when CI's done," and move on to something else. A notification brings them back. The agent's notification is an event landing at the controller, which starts a fresh turn. The build it was "waiting" for cost nothing, because nobody was waiting.

## How a turn says what happened

If a turn just ends, the controller needs to know what it accomplished and what to watch next. Reading the agent's prose reply and guessing is fragile. So every turn ends with one machine-readable line: a small, fixed contract the controller can parse without interpreting English.

![The turn's reply has two readers: a human reads the prose at the top, while the controller reads only the final AGENT_STATUS line. From that line it learns which PRs to watch, what note to surface, and whether a human is needed.](/images/autonomous-agents-that-sleep/status-contract.svg)

The prose at the top is for the teammate reading along. The last line is for the code:

{% highlight javascript %}
// Every turn ends with one line the controller can read:
//   AGENT_STATUS: {"prs":[{"repo":"backend","url":".../pull/42"}],"note":"opened a draft PR"}

const status = parseLastStatusLine(reply);     // ignore the prose, read the contract
for (const pr of status.prs) watch(pr);        // now monitor those PRs for CI + reviews
if (status.attention) pingHuman(status.attention);   // only when genuinely blocked
{% endhighlight %}

That single line is enough to drive the controller's state machine: which pull requests to monitor, a short note to pass along, and an optional `attention` field the agent sets *only* when it's stuck and needs a person. There's no prose-scraping and no guessing. The agent talks to people in sentences and to the controller in one predictable shape.

## The session remembers, even though the turn forgot

A turn that ends and leaves nothing running sounds like it would also forget everything, starting each time as a stranger to its own work. It doesn't, because the conversation is saved separately from the process that ran it. The SDK assigns each turn's first message a **session id**. Hold onto it, and a later turn can *resume* the same conversation with its full history intact.

{% highlight javascript %}
// A later event (CI failed, a new comment) starts a fresh turn,
// but resumes the same session, so the agent still has all its context.
runTurn(continuePrompt, { ...options, resume: sessionId });
{% endhighlight %}

So the turn is stateless, but the agent is not amnesiac. When CI comes back red an hour later, the controller wakes the same session: the agent already knows what it changed and why, and just needs the new fact, the failing test, to keep going. Short-lived turns, long-lived memory.

## Why this works

Pulling the loop out of the agent fixes all three problems from the top, and the reasons are worth stating plainly:

- **It's cheap.** Waiting is free, because nothing is running while the agent is idle. We pay for the model only during the seconds it's actually doing work.
- **It's steerable.** A person can drop a message in at any time. It's just another event in the controller's queue, handled on the next turn, with no loop to interrupt.
- **It survives crashes.** The durable state lives in the controller's store, not in a running process. Restart the controller and every in-flight thread is still there, ready to resume its session.
- **It's observable.** Every turn ends with a status line and a human-readable note, so there's always a clear record of what the agent did and why it stopped.

## But wait, why not just let the agent sleep inside the loop?

A fair objection: the agent could stay in its loop and simply `sleep` between CI checks, so the model isn't called while it waits. That removes the token cost, but not the real problem. A sleeping loop is still a running process holding all of its state in memory, so a crash still means amnesia, and a person still can't reach it until it wakes on its own schedule rather than when something actually happens. "Sleep inside the loop" keeps the fragile part; "end the turn and let an event wake it" removes it. The difference isn't the nap. It's *who* owns the waiting.

## Wrap-up

An autonomous agent doesn't have to be a process that runs until it's done. It can be a series of short turns, each one picking up a saved conversation, doing a piece of work, reporting a single status line, and stopping, with a small, durable controller outside that holds the state and decides when the next turn should run. The agent gets to be powerful and forgetful; the controller gets to be simple and reliable. The waiting, which is where loops go to die, belongs to neither of them. It belongs to the world, which wakes the agent only when there's something new to do.

## Resources

- [Claude Agent SDK overview](https://docs.claude.com/en/api/agent-sdk/overview)
- [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

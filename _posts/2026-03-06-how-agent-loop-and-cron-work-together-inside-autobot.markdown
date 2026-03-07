---
title: "How the agent loop and cron work together inside Autobot"
date: 2026-03-06T10:00:00+02:00
excerpt: "Building an AI agent that runs autonomously on a schedule requires more than just calling an LLM. This post explores how autobot, a Crystal-based AI agent framework, wires together a ReAct-style tool loop, a fiber-based cron scheduler, and a message bus into a system that fits in 2MB."
tags:
  - crystal-lang
  - ai
  - system design
  - development
published: true
---

Most AI agent tutorials end at "call the LLM in a loop." The interesting part, making the agent run autonomously, execute scheduled tasks, and stay coherent across conversations, rarely gets covered.

[Autobot](https://github.com/crystal-autobot/autobot) is an AI agent framework written in Crystal. It compiles to a 2MB binary, uses ~5MB of RAM, and starts in under 20ms. But the interesting part isn't the performance. It's how three systems work together: the agent loop, the cron scheduler, and the message bus. Together they create an agent that can both respond to users and act on its own.

## The big picture

![Autobot architecture](/images/autobot-agent-loop/architecture.svg)

Messages flow in from chat channels, get processed by the agent loop, and flow back out. The cron service injects its own messages into the same bus, reusing the entire agent pipeline. This is the key design decision: cron doesn't bypass the agent, it talks through it.

## The agent loop

The agent loop sits on the message bus, consuming inbound messages one at a time. Every message, whether from a user typing in Telegram or from a cron job firing, enters through the same queue. The loop doesn't care where messages come from.

When a message arrives, the loop does four things:

1. **Load or create a session.** Sessions are JSONL files, one line per message, so conversation history survives restarts.
2. **Consolidate memory.** If the session is getting long, old messages get summarized into long-term memory (more on this later).
3. **Build context.** The system prompt is assembled from identity files (`SOUL.md`, `IDENTITY.md`), long-term memory, active skills, and conversation history.
4. **Execute the tool-calling loop.** This is where the real work happens.

## The tool executor: a ReAct loop

The tool executor implements a [ReAct-style](https://arxiv.org/abs/2210.03629) loop: the LLM reasons about what to do, calls a tool, observes the result, and repeats until it has a final answer. Up to 20 iterations.

Three optimizations keep this efficient:

**Sliding window truncation.** Old tool results get compressed. A `read_file` result might be 5000 characters. On the next iteration, the LLM doesn't need the full content anymore because it already processed it. Results older than one iteration that exceed 500 characters are replaced with a placeholder like `[read_file result: 5000 chars, truncated]`. The LLM knows data existed without burning tokens on it.

**Progressive disclosure.** On iteration 2+, tools that have already been called are sent in compact form: name and parameters only, no description. This saves tokens on every subsequent LLM call without removing the tools from the available set.

**Early termination.** The `stop_after_tool` parameter lets callers break the loop when a specific tool fires. This is critical for cron jobs. When the agent calls the `message` tool to deliver results, the loop stops immediately. No need to continue reasoning after the delivery is done.

## The cron service

The cron service manages scheduled jobs persisted as JSON and executed via Crystal fibers. No polling, no external dependencies.

### Three schedule types

- **At**: one-time execution at a specific timestamp ("remind me at 3pm")
- **Every**: recurring interval in milliseconds ("check every 30 minutes")
- **Cron**: standard 5-field expressions like `0 9 * * 1-5` (weekdays at 9am)

### Two payload types

**AgentTurn** jobs inject a message into the agent loop. The LLM processes the task, uses tools as needed, and sends results to the user. This is for tasks that require reasoning: "summarize today's news," "check if the deploy succeeded and report back."

**Exec** jobs skip the LLM entirely. They run a shell command and deliver the output directly. This is for tasks that don't need intelligence: "run `df -h` and tell me disk usage." The distinction matters for cost. AgentTurn jobs consume LLM tokens on every execution. Exec jobs are free.

### Fiber-based timer

Instead of polling every second to check for due jobs, the cron service calculates the next wake time and sleeps until then using a Crystal fiber. A generation counter prevents stale fibers from executing. When a new job is added, the generation increments and any sleeping fiber from the previous generation exits silently on wake.

When the timer fires, it finds all due jobs, executes them, saves state, and re-arms for the next batch. A background fiber also checks the store file every 60 seconds for external modifications, like jobs added via CLI while the gateway is running.

## Where cron meets the agent loop

This is where the design gets interesting. When a cron job fires, it doesn't call the LLM directly. It publishes a message to the same bus that chat channels use, with a special `cron:` prefix in the sender ID. The agent loop detects this prefix and routes it to a specialized handler.

Cron turns differ from user turns in four ways:

1. **Minimal context.** Formatting rules, skills hints, and session metadata are stripped from the system prompt. A cron job doesn't need conversation norms. This saves tokens.

2. **Restricted tools.** The `spawn` tool (subagent creation) is excluded. A cron job shouldn't create background tasks. The risk of runaway tasks spawning more tasks is too high.

3. **Early stop.** The loop breaks the moment the agent calls the `message` tool. The job's purpose is to deliver information. Once delivered, continuing is wasteful.

4. **No direct response.** Unlike user turns that publish an outbound message, cron turns deliver explicitly through the `message` tool. This gives the LLM control over whether to send anything at all. If there's nothing to report, it stays silent.

The cron prompt itself prevents common failure modes with explicit rules: don't flood users with empty updates, don't delete the job, don't create new scheduled tasks.

### Session continuity

Cron turns are saved to the same session as user conversations, prefixed with `[Scheduled task]`. When a follow-up like "tell me more about that report" comes in, the agent has context. It can see its own cron-generated response in the conversation history.

## The message bus

The bus is built on Crystal's `Channel`, a typed, concurrent-safe communication primitive. Two channels, two directions: inbound (world to agent) and outbound (agent to world). Chat channels, cron, and subagents all publish to inbound. The channel manager consumes outbound and routes to the right destination.

A buffer capacity of 100 handles burst traffic. If a cron job fires while the agent is processing a user message, the cron message waits in the queue instead of blocking the cron fiber. The consumer uses Crystal's `select` with a timeout for periodic shutdown checks.

## Memory consolidation

Sessions grow indefinitely. Left unchecked, the context window fills up and costs escalate.

The memory manager watches session length. When messages exceed the configured window (default: 50), it extracts old messages, asks the LLM to summarize them, and writes the summary to two files:

- **MEMORY.md** for long-term facts (user preferences, project context, technical decisions)
- **HISTORY.md** for timestamped summaries searchable with grep

The session gets trimmed synchronously to prevent race conditions with the agent loop. The LLM summarization runs in a background fiber and only writes to memory files, never touches the session. This keeps conversations coherent across hundreds of messages without blowing up the context window.

## Why Crystal

A few Crystal features make this architecture clean:

**Fibers and channels.** The message bus, cron timers, background summarization, and subagent execution all use lightweight fibers communicating through typed channels. No thread pools, no mutexes, no callback hell.

**Type safety.** Every message, tool result, and cron job is a Crystal struct with compile-time checking. `JSON::Serializable` handles serialization without runtime reflection.

**Single binary.** `crystal build --release` produces a statically-linked binary. The entire framework with LLM providers, cron scheduler, sandbox, and four chat channel integrations compiles to ~2MB.

## Wrap-up

The architecture boils down to one insight: **a cron job is just a message**. By routing scheduled tasks through the same message bus and agent loop that handles user conversations, autobot avoids building a separate execution path for background work. Same pipeline, same tools, same session history.

The three systems reinforce each other:
- The **message bus** decouples producers from consumers
- The **agent loop** processes any message through the same ReAct pipeline
- The **cron service** generates messages on a schedule, reusing the full agent stack

Crystal's fibers and channels make this wiring natural. The cron timer sleeps in a fiber. The agent loop blocks on a channel. Background tasks spawn fibers that announce results through the bus. No threads, no locks, just lightweight concurrency coordinated through typed channels.

## Resources

- [Crystal language](https://crystal-lang.org/)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Crystal concurrency guide](https://crystal-lang.org/reference/guides/concurrency.html)

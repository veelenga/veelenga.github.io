---
title: "The AI inbox"
date: 2026-09-17T08:30:00+02:00
excerpt: "Writing a note takes seconds, organizing it takes minutes, so the pile grows until nothing in it can be found. A simple pattern fixes it: anyone writes to an inbox, and an AI agent organizes it into structured data later, on schedule."
tags:
  - ai
  - agents
  - productivity
published: true
---

We write things down all day: a link to read later, a thought after a meeting, a voice memo on the way home. Writing takes seconds. Organizing takes minutes, so we skip it, and the pile grows until nothing in it can be found.

There's a simple pattern that fixes this. Anyone can write to an inbox, a person or any AI agent, in any shape. Later, on a schedule, an AI agent organizes it all into structured data, by rules we write once.

![ChatGPT, Claude, Grok, a human and any other writer drop rough notes into one inbox. On schedule, an AI agent organizes them one by one into rows of structured data with a type, a title and a project.](/images/the-ai-inbox/inbox.svg)

## The pile that never gets organized

Capturing and organizing look like one job, but they want opposite things. Capturing wants speed: the thought is here now and gone in a minute. Organizing wants time and context: which project it belongs to, whether it's a task or a fact, whether we've seen it before.

When both have to happen in the same moment, we lose either way.

![One new thought, two paths. Organizing it on the spot turns every note into a form, which is too slow, so we stop writing things down. Organizing it later never happens, so the inbox becomes a junk drawer where nothing can be found.](/images/the-ai-inbox/problem.svg)

If we **organize on the spot**, every note becomes a small form: a title, a folder, a few tags. It's too slow, so we stop writing things down. If we **promise to organize later**, later rarely comes. The inbox turns into a junk drawer where everything is kept and nothing is found.

It isn't a lack of discipline. The two jobs just don't fit into the same moment.

## Capture now, organize later

So we split them, and hand the slow job to something that doesn't mind doing it. The pattern has three parts, the same three boxes as in the diagram at the top.

### Inbox

Anything goes into one inbox: a line of text, a link, a voice memo, a forwarded email. No title, no tags, no folder. The inbox has a single job, which is not to lose the thought.

Because it's that simple, anyone can write to it: ChatGPT, Claude, Grok, a phone shortcut, an email forward, or a person typing a line by hand.

### Organize

An AI agent runs on a schedule, for example once a night. It reads every new item in the inbox, together with our rules and what's already organized. For each item it:

- gives it a clear title and fixes typos, without adding or dropping facts
- decides what it is and where it belongs
- links it to related items that already exist
- checks the result against the rules, and only then marks the inbox item as done

The rules are plain text, written once, like instructions for a new assistant: *every note belongs to exactly one project*, *reuse existing tags*, *never delete anything*. When an item doesn't fit the rules, the agent leaves it in the inbox and reports it instead of guessing.

### Structured data

Organized items become structured data: notes with titles and tags, tasks with due dates, and short summaries of where each project stands. The summaries are rewritten on every run, so they always describe *now*, not a history of changes.

The inbox item itself is never edited, only marked as done. If the agent gets something wrong, the original is still there.

### Example: Memo

Memo is a pair of [Claude skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) (small instruction files an agent follows) for personal notes in Notion, built on this pattern. The skill that writes to the inbox, `/memo`, gets to be tiny. This is the whole part that saves a note:

{% highlight markdown %}
## `/memo <what to keep>`

One page in **Inbox**:

- **Title** — short, English.
- **Body** — with an argument, what it names; without one, the substance of the chat.

Answer with the link, one line. A routine fills in the rest.
{% endhighlight %}

No project, no tags, no people, no format to follow. A title, a body, and a link back. A person typing a line straight into the Notion inbox does exactly the same job, and the next step can't tell the difference.

That next step is the second skill, `memo-organize`, and it's where all the organizing happens. It picks the project, finds the people behind every spelling of a name, checks each note with a small script, and rewrites the summaries. That takes about sixty lines of rules, against the few lines above. Organizing is the part that grows, and the only part to change when the rules do.

### Where it fits

The same shape works anywhere things arrive faster than we can organize them:

| Inbox gets | Organized into |
|---|---|
| Rough notes | Titled notes, linked to a project, with tasks pulled out |
| Emails | Tasks, reply drafts, and the rest archived |
| Read-later links | Short summaries with a topic and reading time |
| Voice memos | Transcribed notes and tasks |
| Meeting transcripts | Decisions and action items |
| Project and documentation changes | A changelog and an up-to-date project summary |
| Bug reports and feedback | Labeled issues, with duplicates merged |
| Agent chat logs | Long-term memory about the user |

## Why this works

- **Writing costs nothing.** There are no decisions to make in the moment, so fewer thoughts get lost.
- **Organizing sees the whole picture.** The agent reads the inbox and the existing data together, so it can merge duplicates and link related items. A note organized on the spot only sees itself.
- **One set of rules, many writers.** Whatever writes to the inbox stays simple. Only the organizing agent knows the rules, and it applies them the same way every time.
- **Mistakes can be undone.** The raw items stay. When the rules change, old items can be organized again.
- **It's cheap.** Writing to the inbox barely needs a model, and one run reads the rules and the existing data once for the whole batch. Nobody is waiting, so it can afford a slower, smarter model.

## What it costs

The pattern isn't free. Each cost comes with a simple answer.

- **Delay.** Items wait until the next run. Urgent things don't belong in an inbox; they need action now.
- **Wrong guesses.** Sooner or later the agent will file something in the wrong place. Keeping the raw item, checking the output against the rules and leaving unclear items in the inbox keep those mistakes small.
- **One more thing to run.** A scheduled job has to live somewhere, and it can fail quietly. A short report at the end of every run keeps it visible.
- **Trust.** Handing our notes to an agent feels risky at first. Reviewing the first few runs builds that trust faster than any rule.

## Wrap-up

Capturing and organizing are two different jobs, and trouble starts when we ask for both in the same moment. Splitting them gives each job what it needs: the inbox gets speed, organizing gets time and context.

Keep the inbox dumb, make the organizing smart, and let a schedule connect the two. The rest is choosing where the inbox lives.

## Resources

- [Getting Things Done](https://en.wikipedia.org/wiki/Getting_Things_Done), the productivity method built around an inbox
- [Memory consolidation](https://en.wikipedia.org/wiki/Memory_consolidation), how the brain turns the day's memories into long-term ones while we sleep
- [LangMem: hot path vs subconscious memory](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/), the same split for AI agent memory
- [Autonomous agents that sleep](/autonomous-agents-that-sleep/), on agents that run in short turns instead of long loops

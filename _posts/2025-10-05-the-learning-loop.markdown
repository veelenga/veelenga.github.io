---
title: The learning loop
date: 2025-10-05T08:51:00+02:00
categories:
excerpt: Master the Learn → Practice → Share cycle that successful developers use to build skills. Discover why AI makes this loop faster and why Reflect is now the critical fourth step to turn speed into deep understanding.
tags:
  - learning
  - productivity
  - ai
published: true
---

How to learn new technologies effectively and quickly?
The answer is a simple learning cycle that's worked for decades and still works today, with one important update for the AI era.

Fast learning engineers follow a three-step cycle: **Learn → Practice → Share** (or its variations).
This is how our brains naturally and effectively build skills.

![Learning Loop Diagram](/images/learning-loop/diagram.svg)

### Learn

The key to efficient learning is learning what's needed, when it's needed.

- Start with the basics to get a high-level understanding first. Don't learn everything at once.
- Learn as needed once practicing starts. Do not hesitate to skip what's not relevant yet.
- Use whatever works best for the current stage. Official docs, videos, blogs, or books etc.
- Go deeper with each loop.

### Practice

Practice turns information into skill. Real understanding comes from struggling with doing.

- Start immediately without waiting until "learned enough."
- Embrace the struggle as copy-pasting teaches nothing.
- Build progressively from simple projects to personal projects to real challenges (production features).
- Experiment and break things to see what fails and why. Understanding failure modes leads to better code.
- Work on real projects where real constraints and real problems force real learning.

### Share

Sharing isn't just being nice. It's the best way to learn. Teaching forces messy knowledge into clear understanding.

- Write for past self documenting how that tricky bug got solved.
- Answer questions online as explaining solutions forces deeper thinking.
- Teach teammates through code reviews, pair programming, or presentations.
- Share the journey with both wins and failures. Start simple, go deeper over time.

## Why This Loop Works

Each time through the cycle makes us stronger:

**First loop**: Barely understanding basics. Code is messy. Explanations are rough. <br>
**Fifth loop**: Patterns emerge. Code improves. Can explain trade-offs, not just syntax. <br>
**Tenth loop**: Have opinions. See bigger patterns. Teach others confidently.

Each step reinforces the others:
- **Learning** gives mental models
- **Practice** tests those models against reality
- **Sharing** forces clear explanation
- **The next loop** builds on everything learned

This is why experienced developers learn new things so quickly. They've just done more loops.

## The AI Challenge

AI is a powerful accelerator for the learning loop.
It helps learn concepts faster, build projects quicker, and even draft explanations when sharing.
It's now possible to take a shortcut and skip learning entirely, dive straight into practice, and get working results.

But this speed creates a hidden danger.
When working code can be built in hours instead of weeks, the struggle that creates deep understanding gets skipped.
Results come fast, but insight doesn't.
This leads to building anything while understanding nothing, which works fine until real complexity shows up and there's no foundation to handle it.

This is why AI demands a new step: **Reflect**. The deliberate pause that transforms speed into real understanding.
Reflection in this context means analyzing the decisions:

**Design Choices:**
- Why was the code structured this way?
- What other approaches could have worked?
- How will this scale with more users or data?
- What are the security implications?

**Trade-offs:**
- What was optimized for? Speed? Simplicity? Maintainability? Running cost?
- What was sacrificed? Performance for readability? Flexibility for simplicity?
- When would different trade-offs make more sense?

**Patterns:**
- What patterns were used and why?
- Where else have similar problems appeared?
- How would experienced developers approach this?

> **Note:** Reflection isn't new.
> Learning science calls it [metacognition](https://en.wikipedia.org/wiki/Metacognition) or [deliberate practice](https://en.wikipedia.org/wiki/Practice_(learning_method)#Deliberate_practice) with reflection.
> Experienced developers already do this naturally. What's new is making it explicit and essential in the AI era, where speed can easily replace depth.

## The Future: Build → Reflect?

As AI improves, the loop might compress.

Today, non-developers can use AI to build simple apps. But they hit walls fast.
Can't integrate with existing systems, handle complex features, or build something that scales.

Imagine that the future AI can:
- Build complete systems while explaining every decision
- Handle complex integrations
- Optimize for real constraints like cost and speed
- Handle cross project communication
- Basically solve a problem, not just write a code

The loop could become just two steps:

1. **Build**: describe the complete vision with all constraints, and AI creates systems while teaching why each decision was made.
2. **Reflect**: analyze what was built and develop intuition. Understanding when different approaches make sense and what global thinking was missing.

In this future, "Learn" and "Practice" merge into "Build".
Learning happens by building with an expert AI assistant.
"Share" becomes part of "Reflect" as the AI helps articulate insights and document decisions.

This isn't about replacing developers, but it does require a shift in thinking.
Developers must evolve into system architects who think globally from the start.
For example, without understanding upfront whether building for 10 users or 10 million, AI might suggest SQLite initially, only to require a complete rewrite later.
The role becomes less about writing code and more about defining business needs, scalability requirements, constraints, and ensuring systems solve real problems from day one.

## Wrap up

The next time tackling a new technology or framework, try adding that pause.
After building something with AI's help, stop and reflect.
Ask those hard questions about design, trade-offs, and patterns.
That's where speed turns into mastery.

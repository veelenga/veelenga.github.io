# CLAUDE.md

Instructions for writing blog posts in this repo. The goal is to preserve the author's voice.

## Voice

- Write for someone seeing the topic for the first time. Explain the idea before the API, the analogy before the jargon. If a term is unavoidable, define it inline in plain words.
- Use **"we"**, not "you". Rephrase if neither fits ("It can be done", "the host pushes...").
- Tone is **professional but warm**: short sentences, concrete nouns, real examples. No hype, no "Imagine if..." or "What if..." openings.
- Prefer everyday words to technical synonyms when the meaning carries (e.g. "ticket" instead of "registry reference" when explaining concepts).
- Anchor abstract ideas to things readers already know.

## Structure

Posts vary widely — tutorials, conceptual deep-dives, retrospectives, tool announcements. Don't force every post into one template. Principles:

- **Open with the problem or context, not a feature list.** The reader needs to know *why this matters* before *how it works*.
- **Concept before code.** Explain the idea (with diagrams when it helps) before showing snippets. If the post is about a tool, the snippets sit closer to the end.
- **Lead the eye with a hero visual.** When a diagram or animation exists, place it near the top so it's visible without scrolling.
- **Justify choices with a "Why X" section.** Most posts include at least one: *Why Crystal*, *Why Socket Mode*, *Why this works*, *Why it matters*.
- **Address the obvious skeptic.** A "But wait — why not just X?" framing works well when the answer isn't already clear.
- **Close with `## Wrap-up`.** One or two paragraphs, no new ideas. Optionally followed by `## Resources`.
- **Asides** (`## A small aside: ...`) are good for follow-up questions that would derail the main flow.

## Visualization

Diagrams aren't required, but the author leans on them. When a concept has moving parts, a static diagram or screenshot lifts the post; when a concept evolves over time (a flow, a protocol, a state machine), an animation lifts it more. Use them when they earn their weight, not as decoration.

- Hand-crafted SVG is preferred. Mermaid won't render — the Jekyll setup doesn't have the plugin.
- For animated SVG, use **SMIL** (`<animate>`, `<animateTransform>`). No JavaScript. Don't mix CSS `transform` in `<style>` with the element's `transform` attribute — they collide silently.
- When an animation walks through stages, pair it with **static "frame" images** that depict exactly what the animation shows at those moments. Same visual style across frames.
- All images for a post live in `images/<post-slug>/`. Don't commit dev artifacts (local `preview.html`, temp screenshots).
- Label every arrow. Keep labels clear of arrowheads. Don't let badges overlap box contents.

## Review checklist before opening a PR

- No instances of "you", "your", "you've", "you'll".
- Intro is short (~3 sentences). No "What if..." / "Imagine..." openings.
- Jargon either defined inline or removed.
- At least one "why" justification is present.
- A `## Wrap-up` exists.
- If the post has visuals: the hero image is visible without scrolling, and frame images match the animation they reference.

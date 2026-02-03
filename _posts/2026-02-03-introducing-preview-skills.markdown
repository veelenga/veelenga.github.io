---
title: "Preview skills: visualizations for AI-assisted development"
date: 2026-02-03T14:00:00+02:00
excerpt: "Reviewing raw JSON, CSV, or Mermaid diagrams in the terminal is a cognitive burden. Preview skills solve this by rendering visual previews directly in the browser — no servers, no dependencies."
tags:
  - ai
  - skills
  - development
  - visualization
published: true
---

Developers work with structured data constantly: database exports, API responses, configuration files.
Add AI agents to the mix and the volume increases. JSON, CSV, Mermaid diagrams generated in seconds.

But reviewing this output? That's where friction lives.

## The Problem

Structured data in raw form creates cognitive load.
A 500-line JSON file from an API. We scroll through it, mentally parsing nested structures, looking for that one field.
A CSV export from the database. Thousands of rows, no way to sort or filter without importing into a spreadsheet.
A Mermaid diagram the agent just generated. We copy it to an online renderer, wait for it to load, realize there's an error, iterate.

This friction compounds.
Every time we context-switch between the terminal and external tools, we lose focus.
Every time we parse raw data mentally, we burn cognitive resources that should go toward actual problem-solving.

The data is there. The tooling to view it isn't.

## What Are Preview Skills?

[Preview skills](https://github.com/veelenga/preview-skills) are standalone tools that render visual previews directly in the browser.
No servers. No external dependencies. Just self-contained HTML files that open instantly.

Each skill takes a file or piped input and generates an interactive preview:

| Skill | Purpose |
|-------|---------|
| `preview-csv` | Sortable tables with filtering and column statistics |
| `preview-json` | Collapsible tree view with syntax highlighting |
| `preview-markdown` | GitHub-flavored rendering with code highlighting |
| `preview-mermaid` | Interactive diagrams (flowcharts, sequences, ERD) |
| `preview-diff` | GitHub-style diffs with side-by-side comparison |
| `preview-d3` | Interactive 2D data visualizations |
| `preview-threejs` | 3D visualizations with orbit controls |
| `preview-leaflet` | Interactive maps with markers and routes |

## Installation

Clone and install:

```bash
git clone https://github.com/veelenga/preview-skills.git && cd preview-skills
scripts/install.sh --all
```

That's it. Skills are standalone bash scripts — no runtime dependencies required.
By default, they install to `~/.claude/skills` for Claude Code integration, but work from any location.

## How It Works

The workflow is simple:

1. Point the skill at a file or pipe data to it
2. A self-contained HTML file opens in the browser
3. Review the output visually

```bash
# Preview a CSV file
/preview-csv data.csv

# Pipe JSON directly
echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | /preview-json

# Render a Mermaid diagram
/preview-mermaid architecture.mmd
```

Each skill generates a standalone HTML file with embedded CSS and JavaScript.
The browser opens automatically.
No servers, no build steps — just instant visual feedback.

## Use Cases

### Database Exports

Export a table to CSV, run `/preview-csv data.csv`.
A sortable, filterable table appears with column statistics (min, max, average, unique counts).
Instead of importing into Excel or grepping through thousands of rows, we explore visually.

### API Responses

Debugging an API? Pipe the response directly: `curl api.example.com/users | /preview-json`.
A collapsible tree view with syntax highlighting.
Expand only the sections that matter, collapse the rest.

### Architecture Diagrams

Ask the agent to create a Mermaid diagram, then `/preview-mermaid diagram.mmd`.
The actual flowchart renders instantly — not the code that describes it.
Iterate on the diagram without leaving the terminal.

### Git Diffs

Reviewing changes? `git diff | /preview-diff` renders a GitHub-style diff view.
Side-by-side comparison, file expansion/collapse, search filtering — all in the browser.

### Data Visualization

Sometimes raw numbers need a chart. Preview skills include three visualization engines:

- **D3.js** — bar charts, line graphs, scatter plots, network diagrams
- **Three.js** — 3D models, point clouds, spatial data
- **Leaflet** — maps with markers, routes, geographic data

Ask the agent to analyze data and create a visualization.
The agent writes the visualization code, `/preview-d3` renders it instantly.
No need to export data to external charting tools.

```bash
# Render a D3 visualization
/preview-d3 sales-chart.d3.js

# View 3D data
/preview-threejs model.threejs

# Display geographic data on a map
/preview-leaflet locations.leaflet.js
```

## Why It Matters

Preview skills shift the cognitive load from human to machine.
Instead of parsing raw output, we review visual representations.
Instead of context-switching to external tools, we stay in the flow.

Whether it's a database export, an API response, or agent-generated content — the feedback loop tightens.
Generate, preview, iterate — all without leaving the terminal.

## Resources

- [Preview skills website](https://veelenga.github.io/preview-skills/)
- [Preview skills on GitHub](https://github.com/veelenga/preview-skills)

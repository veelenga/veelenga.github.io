---
permalink: /projects/
layout: page
title: "Projects"
description: "Open source projects and small apps by Vitalii Elenhaupt: Crystal tooling, Claude Code skills, MCP servers, and endurance sport utilities."
wide: true
---

<div class="projects-grid">

{% include project_entry
  ref='https://veelenga.github.io/literkowo/'
  name='Literkowo'
  eager=true
  description='A typing adventure for kids in a blocky 3D world'
  sup='A free browser game where children learn to touch type in Polish or English by beating word monsters. One new key per level, tricky enemies and bosses, an arena, a shop with pets and hats, and music generated live. No ads and no account.'
  logo_ref='/images/demo/literkowo.webp'
  logo_width='1100'
  logo_height='578'
  tech_stack='TypeScript, Three.js, Web Audio'
%}

{% include project_entry
  ref='https://whatmakesittick.github.io/uk/'
  name='What Makes It Tick'
  eager=true
  description='Interactive 3D explainers of how things work'
  sup='Each explainer takes a machine or a natural phenomenon apart, slows it down and lets the reader turn it around while the text walks through how it works. Engines, microscopes, gliders, oil rigs and more, in eight languages.'
  logo_ref='/images/demo/whatmakesittick.webp'
  logo_width='1100'
  logo_height='578'
  tech_stack='TypeScript, Three.js, 3D'
%}

{% include project_entry
  ref='https://github.com/veelenga/strava-wind-overlay'
  name='Strava Wind Overlay'
  description='Windy-style wind layer on Strava maps'
  sup='A Chrome extension that draws animated wind particles and a speed colour fill over Strava maps. A forecast timeline shows hourly wind, gusts and direction up to 6 days ahead, so a ride can be planned for the best conditions.'
  logo_ref='/images/demo/strava-wind-overlay.webp'
  logo_width='1000'
  logo_height='580'
  tech_stack='TypeScript, Chrome Extension'
%}

{% include project_entry
  ref='https://github.com/veelenga/insta360-go-ultra-transfer'
  name='igut'
  description='Browse and copy media from Insta360 GO Ultra over WiFi'
  sup='Unofficial desktop companion for the Insta360 GO Ultra camera. Web gallery with live previews, batch downloads with Finder-style progress, and a CLI. Built on a reverse-engineered WiFi protocol, installable via Homebrew.'
  logo_ref='/images/demo/igut.webp'
  logo_width='1100'
  logo_height='530'
  tech_stack='Python, React, Homebrew'
%}

{% include project_entry
  ref='https://github.com/crystal-autobot/autobot'
  name='Autobot'
  post='/how-agent-loop-and-cron-work-together-inside-autobot/'
  description='Ultra-lightweight personal AI assistant framework'
  sup="A fast, secure, and efficient AI automation tool built in Crystal. 2MB binary, ~5MB RAM, <20ms startup. Supports multiple LLM providers, chat channels, vision, voice, and kernel-level sandboxing."
  logo_ref='/images/demo/autobot.webp'
  logo_width='1100'
  logo_height='550'
  tech_stack='Crystal, AI, Telegram, Slack'
%}

{% include project_entry
  ref='https://github.com/veelenga/preview-skills'
  name='Preview Skills'
  post='/introducing-preview-skills/'
  description='Reduce cognitive load when reviewing AI agent work'
  sup="Standalone preview skills for visualizing files in the browser. Transform plans, diffs, and data into navigable previews. Zero dependencies, self-contained, works with any AI coding agent."
  logo_ref='/images/demo/preview-skills.webp'
  logo_width='1100'
  logo_height='578'
  tech_stack='JavaScript, Claude Code, HTML'
%}

{% include project_entry
  ref='https://github.com/veelenga/claude-mermaid'
  name='Claude Mermaid'
  post='/building-mcp-server-for-claude/'
  description='MCP server for rendering Mermaid diagrams in Claude Code'
  sup="An MCP server that enables Claude to render and preview Mermaid diagrams with live browser updates."
  logo_ref='/images/claude-mcp/claude-code.png'
  tech_stack='TypeScript, MCP, Node.js'
%}

{% include project_entry
  ref='https://veelenga.github.io/zwo-generator/'
  name='Zwift Workout Generator'
  post='/building-an-ai-powered-zwift-workout-generator/'
  description='Generate Zwift workouts using natural language'
  sup="An AI-powered tool that lets you create structured Zwift workouts by describing them in plain English. Combines AI generation with direct manipulation for precise control."
  logo_ref='/images/demo/zwift-workout-generator.webp'
  logo_width='1000'
  logo_height='916'
  tech_stack='JavaScript, OpenAI, React'
%}

{% include project_entry
  ref='https://veelenga.github.io/phrase-bridge/?bridge=UA-PL'
  name='Phrase Bridge'
  description='Learn a new language, bridge new cultures every day'
  sup="An app that helps you learn languages by creating daily phrases using OpenAI."
  logo_ref='/images/demo/phrase-bridge.webp'
  logo_width='1100'
  logo_height='495'
  tech_stack='JavaScript, OpenAI'
%}

{% include project_entry
  ref='https://github.com/veelenga/prompt-garmin-workout'
  name='Prompt Garmin Workout'
  description='Create Garmin Connect workouts using generative AI'
  sup="This project allows you to create complex Garmin workouts using natural language input processed by OpenAI's GPT."
  logo_ref='/images/demo/openai-garmin-workout.webp'
  logo_width='1100'
  logo_height='542'
  tech_stack='JavaScript, OpenAI, Chrome Extension'
%}

{% include project_entry
  ref='https://donaty.io'
  name='Donation Charity'
  description='Fully transparent on-chain donations'
  sup='Here at Donaty.io we believe that everyone should have the opportunity to give back to the community.'
  logo_ref='/images/demo/donaty.webp'
  logo_width='1100'
  logo_height='719'
  tech_stack='Ruby on Rails, Blockchain, Web3'
%}

{% include project_entry
  ref='https://veelenga.github.io/rblist'
  name='Russia Block List'
  description='See how top world companies react to Russia invasion'
  sup='Do not support the agressor #StandWithUkraine'
  logo_ref='/images/demo/rblist.webp'
  logo_width='1100'
  logo_height='608'
  tech_stack='JavaScript, React'
%}

{% include project_entry
  ref='https://crystal-ameba.github.io/'
  name='Ameba'
  description='Code style linter for Crystal'
  sup='A single-celled animal that catches food and moves about by extending fingerlike projections of protoplasm.'
  logo_ref='/images/demo/ameba.webp'
  logo_width='1100'
  logo_height='445'
  tech_stack='Crystal, Static Analysis'
%}

{% include project_entry
  ref='https://github.com/veelenga/awesome-crystal'
  name='Awesome Crystal'
  description='A curated list of awesome Crystal code and resources'
  sup='The goal is to have projects mostly stable and useful for the community.'
  logo_ref='/images/demo/awesome-crystal.webp'
  logo_width='1071'
  logo_height='195'
  tech_stack='Crystal, Community'
%}

{% include project_entry
  ref='https://github.com/crystal-community/crystal-patterns'
  name='Crystal Patterns'
  description='Design patterns implemented in Crystal language'
  sup='The goal is to have a set of GOF patterns for Crystal users.'
  tech_stack='Crystal, Design Patterns'
%}

{% include project_entry
  ref='https://github.com/crystal-community/crystal-ann'
  name='Crystal [ANN]'
  description='Announce new project, blog post, version update or any other Crystal work'
  sup='Crystal [ANN] is intended to spread announcements with community. A new announcement will appear on this website, on Twitter and distributed over RSS. People being interested will not miss it.'
  logo_ref='/images/demo/crystal-ann.webp'
  logo_width='1100'
  logo_height='747'
  tech_stack='Crystal, Amber'
%}

{% include project_entry
  ref='https://veelenga.github.io/jsonapi-payload-explorer/'
  name='JSON:API Payload Explorer'
  description='A tool to preview, search and inspect JSON:API payloads'
  sup='Supports sideposting and sideloading for complex JSON:API document structures.'
  logo_ref='/images/demo/jsonapi-payload-explorer.webp'
  logo_width='1100'
  logo_height='698'
  tech_stack='JavaScript, JSON:API'
%}

{% include project_entry
  ref='https://github.com/crystal-ameba/ameba.el'
  name='Ameba.el'
  description='An Emacs plugin for Ameba static code analysis'
  sup='Intended to help people use Ameba tool directly in Emacs.'
  logo_ref='/images/demo/emacs-ameba.webp'
  logo_width='1016'
  logo_height='1200'
  tech_stack='Emacs Lisp, Crystal'
%}

</div>

---
id: generator-003
title: "Generator pipeline: markdown to posts.json"
summary: Outline of the static build flow and runtime overlays.
tags: [blog, pipeline]
project: le-belle-epoch
voice_id: kokoro_default
published_at: 2025-12-26
---

The build pipeline converts markdown front matter into a posts.json snapshot for fast loading, with optional HTML generation for static pages. This keeps the UI responsive in both local and MLX-first environments.

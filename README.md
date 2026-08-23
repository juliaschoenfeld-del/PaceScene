# PaceScene Launch MVP

A deployable endurance mental-rehearsal app with real server-side AI generation.

PaceScene supports race/event rehearsal, key training-session rehearsal, and multi-week training-block rehearsal for endurance sports including running, cycling, swimming, triathlon, rowing, cross-country skiing, HYROX/hybrid endurance and related disciplines.

The browser posts athlete inputs to `/api/generate`. That Netlify Function uses the OpenAI SDK through Netlify AI Gateway server-side, so no provider API key is exposed to the browser. If AI generation is unavailable, the app falls back to a local rehearsal engine.

`netlify.toml` publishes `public/` and loads functions from `netlify/functions/`.

Before a commercial public launch, replace placeholder legal/operator details, complete trademark/domain clearance, define age/consent rules, add monitoring/rate limiting, and add billing terms before charging users.

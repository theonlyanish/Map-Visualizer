# Starfall Atlas

Starfall Atlas is a frontend data-visualization prototype that turns public GitHub activity into a navigable code galaxy. Repositories become constellation points, GitHub events arrive as animated signals, and repos are grouped into topic regions such as Machine Learning, Frontend, Infra, DevTools, Data, Security, Mobile, and Systems.

## Data

The live mode uses GitHub's public Events API:

```text
https://api.github.com/events?per_page=100
```

GitHub documents this endpoint as polling-oriented rather than true realtime, and it may have latency. Starfall respects the `X-Poll-Interval` header where browsers expose it and uses ETag requests when available.

When run through `server.js`, the browser fetches `/api/github-events`, which proxies GitHub's public events through the local server. If both the proxy and direct browser request fail, the app switches to `demo` signal mode and keeps the atlas moving with local event-shaped data.

## Run

Run the local server, then open the printed URL:

```bash
npm start
```

The app can still be opened from `index.html`, but the local server is recommended because it provides a same-origin proxy for GitHub events.

## Modes

- `Live`: fetches public GitHub events and renders them as they arrive.
- `Quiet`: keeps the constellation field visible without new meteors.

## Controls

- Event filters toggle which GitHub event types are rendered.
- Region controls focus the atlas on one topic neighborhood.
- Density controls adjust the pacing from calm to storm.
- Drag pans the code atlas.
- Shift-drag rotates the atlas.
- Mouse wheel scroll zooms into or out of the atlas toward the pointer.
- Clear resets the visible sky without changing the selected mode.
- Clicking a visible repository constellation opens that repository on GitHub.

## Atlas regions

Repos are classified locally from owner/name heuristics. If a repo does not clearly match a known topic, it receives a stable region assignment from its repo name so the atlas stays spatially alive without extra per-repository API calls.

## Visual language

- Most events arrive as meteors.
- Releases bloom as supernovas at the repository.
- Create events light up as new constellation nodes.

## Assets

- `assets/favicon.png`: generated with the built-in image generation tool from a Starfall favicon prompt.

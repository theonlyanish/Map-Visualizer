# Starfall

Starfall is a frontend data-visualization prototype that turns public GitHub activity into a meteor shower. Repositories become constellation points, and events arrive as animated pushes, stars, forks, issues, pull requests, releases, and comments.

## Data

The live mode uses GitHub's public Events API:

```text
https://api.github.com/events?per_page=100
```

GitHub documents this endpoint as polling-oriented rather than true realtime, and it may have latency. Starfall respects the `X-Poll-Interval` header where browsers expose it and uses ETag requests when available.

## Run

Open `index.html` in a browser. No build step is required.

## Modes

- `Live`: fetches public GitHub events and renders them as they arrive.
- `Quiet`: keeps the constellation field visible without new meteors.

## Controls

- Event filters toggle which GitHub event types become meteors.
- Density controls adjust the pacing from calm to storm.
- Clear resets the visible sky without changing the selected mode.
- Clicking a visible repository constellation opens that repository on GitHub.

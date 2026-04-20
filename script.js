const canvas = document.querySelector("#sky");
const ctx = canvas.getContext("2d", { alpha: true });
const appShell = document.querySelector(".app-shell");

const signalStatus = document.querySelector("#signalStatus");
const eventCount = document.querySelector("#eventCount");
const repoCount = document.querySelector("#repoCount");
const eventDock = document.querySelector("#eventDock");
const hoverCard = document.querySelector("#hoverCard");
const hoverType = document.querySelector("#hoverType");
const hoverRepo = document.querySelector("#hoverRepo");
const hoverActor = document.querySelector("#hoverActor");
const appKicker = document.querySelector("#appKicker");
const appLede = document.querySelector("#appLede");
const viewButtons = [...document.querySelectorAll(".view-button")];
const modeButtons = [...document.querySelectorAll(".mode-button[data-mode]")];
const densityButtons = [...document.querySelectorAll(".density-button")];
const regionButtons = [...document.querySelectorAll(".region-button")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const clearSky = document.querySelector("#clearSky");

const GITHUB_EVENTS_URL = "https://api.github.com/events?per_page=100";
const API_URLS = window.location.protocol === "file:" ? [GITHUB_EVENTS_URL] : ["/api/github-events"];
const MAX_REPOS = 100;
const MAX_METEORS = 180;
const MAX_BURSTS = 140;
const MAX_PHENOMENA = 60;
const EVENT_SPAWN_MS = 430;
const DENSITY_MS = {
  calm: 920,
  normal: 430,
  storm: 135,
};

const eventVisuals = {
  PushEvent: { label: "Push", color: "#f5c86b", radius: 3.4, trail: 0.9 },
  WatchEvent: { label: "Star", color: "#8ff0c8", radius: 3.2, trail: 0.55 },
  ForkEvent: { label: "Fork", color: "#78d7ff", radius: 3.2, trail: 0.7 },
  PullRequestEvent: { label: "Pull request", color: "#ff8e8e", radius: 3.5, trail: 0.75 },
  IssuesEvent: { label: "Issue", color: "#f7a7d8", radius: 2.8, trail: 0.5 },
  IssueCommentEvent: { label: "Comment", color: "#c3b5ff", radius: 2.5, trail: 0.45 },
  CreateEvent: { label: "Create", color: "#cce98b", radius: 3, trail: 0.55 },
  ReleaseEvent: { label: "Release", color: "#d6ef7f", radius: 4.2, trail: 0.95 },
  DeleteEvent: { label: "Delete", color: "#a8aa9a", radius: 2.4, trail: 0.38 },
  default: { label: "Event", color: "#d8dccb", radius: 2.4, trail: 0.45 },
};

const atlasRegions = [
  {
    id: "ml",
    label: "Machine learning",
    color: "#8ff0c8",
    center: { x: -620, y: -260, z: 120 },
    layout: "spiral",
    keywords: [
      "ai",
      "ml",
      "llm",
      "gpt",
      "model",
      "vision",
      "diffusion",
      "tensor",
      "torch",
      "keras",
      "transformer",
      "embedding",
      "rag",
      "agent",
    ],
    orgs: ["openai", "huggingface", "pytorch", "tensorflow", "keras-team", "langchain-ai"],
  },
  {
    id: "frontend",
    label: "Frontend",
    color: "#78d7ff",
    center: { x: -90, y: -390, z: -120 },
    layout: "arc",
    keywords: ["react", "vue", "svelte", "next", "vite", "css", "ui", "web", "tailwind", "component"],
    orgs: ["vercel", "facebook", "sveltejs", "vitejs", "tailwindlabs", "vuejs"],
  },
  {
    id: "infra",
    label: "Infra",
    color: "#f5c86b",
    center: { x: 610, y: -245, z: 90 },
    layout: "lattice",
    keywords: ["kubernetes", "docker", "terraform", "cloud", "server", "operator", "helm", "infra"],
    orgs: ["kubernetes", "docker", "hashicorp", "cloudflare", "prometheus", "grafana"],
  },
  {
    id: "devtools",
    label: "DevTools",
    color: "#c3b5ff",
    center: { x: 540, y: 245, z: -110 },
    layout: "chain",
    keywords: ["cli", "tool", "editor", "lint", "format", "compiler", "build", "debug", "test"],
    orgs: ["microsoft", "eslint", "prettier", "webpack", "rollup", "babel"],
  },
  {
    id: "data",
    label: "Data",
    color: "#d6ef7f",
    center: { x: -170, y: 390, z: 150 },
    layout: "ring",
    keywords: ["data", "db", "sql", "postgres", "mongo", "redis", "analytics", "warehouse", "spark"],
    orgs: ["postgres", "mongodb", "redis", "apache", "duckdb", "supabase"],
  },
  {
    id: "security",
    label: "Security",
    color: "#ff8e8e",
    center: { x: -650, y: 240, z: -160 },
    layout: "wedge",
    keywords: ["security", "crypto", "auth", "scan", "vulnerability", "secret", "oauth", "tls"],
    orgs: ["trailofbits", "openssl", "letsencrypt", "auth0", "zapier"],
  },
  {
    id: "mobile",
    label: "Mobile",
    color: "#f7a7d8",
    center: { x: 70, y: 90, z: 310 },
    layout: "swarm",
    keywords: ["android", "ios", "swift", "kotlin", "flutter", "react-native", "mobile"],
    orgs: ["flutter", "android", "apple", "ionic-team", "react-native-community"],
  },
  {
    id: "systems",
    label: "Systems",
    color: "#d8dccb",
    center: { x: 650, y: 50, z: 300 },
    layout: "core",
    keywords: ["rust", "go", "zig", "kernel", "runtime", "node", "deno", "wasm", "system"],
    orgs: ["rust-lang", "golang", "ziglang", "nodejs", "denoland", "bytecodealliance"],
  },
  {
    id: "other",
    label: "Outer rim",
    color: "#a8aa9a",
    center: { x: -30, y: 30, z: -340 },
    layout: "rim",
    keywords: [],
    orgs: [],
  },
];

const atlasRegionMap = new Map(atlasRegions.map((region) => [region.id, region]));

const fallbackRepos = [
  "vercel/next.js",
  "facebook/react",
  "microsoft/vscode",
  "openai/openai-node",
  "rust-lang/rust",
  "sveltejs/svelte",
  "vitejs/vite",
  "maplibre/maplibre-gl-js",
  "pmndrs/react-three-fiber",
  "denoland/deno",
  "nodejs/node",
  "tailwindlabs/tailwindcss",
];

const fallbackActors = [
  "octocat",
  "frontend-signal",
  "ship-it-bot",
  "map-dreamer",
  "release-sentinel",
  "night-committer",
];

let width = 0;
let height = 0;
let dpr = 1;
let mode = "live";
let etag = "";
let pollTimer = null;
let lastSpawn = 0;
let totalEvents = 0;
let lastFetchAt = 0;
let pointer = { x: -999, y: -999 };
let hoveredRepo = null;
let spawnInterval = EVENT_SPAWN_MS;
let activeDensity = "normal";
let activeRegion = "all";
let viewMode = "starfall";
let dragState = null;
const camera = {
  rotX: -0.18,
  rotY: 0.34,
  zoom: 1.2,
  panX: 0,
  panY: 0,
};

const repoNodes = new Map();
const seenEvents = new Set();
const eventQueue = [];
const replayDeck = [];
const meteors = [];
const bursts = [];
const stars = [];
const phenomena = [];
const enabledTypes = new Set(filterButtons.map((button) => button.dataset.filter));

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  seedStars();
  for (const repo of repoNodes.values()) {
    placeRepo(repo);
  }
}

function seedStars() {
  stars.length = 0;
  const count = Math.floor((width * height) / 6200);
  for (let i = 0; i < count; i += 1) {
    const seed = hashString(`${i}-${width}-${height}`);
    stars.push({
      x: (seed % 10000) / 10000 * width,
      y: ((seed / 10000) % 10000) / 10000 * height,
      r: 0.35 + (seed % 7) / 11,
      phase: (seed % 628) / 100,
      glow: 0.16 + (seed % 12) / 70,
    });
  }
}

function placeRepo(repo) {
  const hash = hashString(repo.name);
  const region = atlasRegionMap.get(repo.regionId) || atlasRegionMap.get("other");
  const band = (hash % 1000) / 1000;
  const angle = (hash % 6283) / 1000;
  const centerBias = Math.sin(band * Math.PI);
  const rx = width * (0.18 + centerBias * 0.32);
  const ry = height * (0.16 + centerBias * 0.3);
  repo.sx = clamp(width * 0.54 + Math.cos(angle) * rx + (((hash >>> 8) % 100) - 50), 42, width - 42);
  repo.sy = clamp(height * 0.52 + Math.sin(angle) * ry + (((hash >>> 16) % 100) - 50), 92, height - 88);

  const offset = regionOffset(region, hash);
  repo.wx = region.center.x + offset.x;
  repo.wy = region.center.y + offset.y;
  repo.wz = region.center.z + offset.z;
}

function regionOffset(region, hash) {
  const a = (hash % 6283) / 1000;
  const b = ((hash >>> 8) % 1000) / 1000;
  const c = ((hash >>> 18) % 1000) / 1000;
  const jitterX = (((hash >>> 4) % 100) - 50) * 0.32;
  const jitterY = (((hash >>> 14) % 100) - 50) * 0.28;

  if (region.layout === "spiral") {
    const arm = hash % 3;
    const angle = b * 5.4 + arm * 2.09;
    const radius = 20 + c * 130;
    return {
      x: Math.cos(angle) * radius + jitterX,
      y: Math.sin(angle) * radius * 0.72 + jitterY,
      z: Math.sin(angle * 1.35) * 68 + (b - 0.5) * 45,
    };
  }

  if (region.layout === "arc") {
    const angle = -2.7 + b * 2.15;
    const radius = 88 + c * 72;
    return {
      x: Math.cos(angle) * radius + jitterX,
      y: -22 + Math.sin(angle) * radius * 0.58 + jitterY,
      z: (c - 0.5) * 110,
    };
  }

  if (region.layout === "lattice") {
    const column = hash % 5;
    const row = (hash >>> 5) % 4;
    return {
      x: (column - 2) * 48 + jitterX,
      y: (row - 1.5) * 42 + jitterY,
      z: (c - 0.5) * 120,
    };
  }

  if (region.layout === "chain") {
    const x = (b - 0.5) * 260;
    return {
      x,
      y: Math.sin(b * Math.PI * 3) * 34 + (c - 0.5) * 56,
      z: Math.cos(b * Math.PI * 2) * 62,
    };
  }

  if (region.layout === "ring" || region.layout === "rim") {
    const radius = region.layout === "rim" ? 120 + c * 62 : 62 + c * 72;
    return {
      x: Math.cos(a) * radius + jitterX,
      y: Math.sin(a) * radius * 0.72 + jitterY,
      z: Math.sin(a * 2) * 55,
    };
  }

  if (region.layout === "wedge") {
    const angle = -Math.PI / 2 + (b - 0.5) * 2.2;
    const radius = 38 + c * 118;
    return {
      x: Math.cos(angle) * radius + jitterX,
      y: Math.sin(angle) * radius * 0.8 + 34 + jitterY,
      z: (b - 0.5) * 95,
    };
  }

  if (region.layout === "swarm") {
    const lobe = hash % 2 === 0 ? -1 : 1;
    const radius = 28 + c * 74;
    return {
      x: lobe * 58 + Math.cos(a) * radius * 0.72 + jitterX,
      y: Math.sin(a) * radius + jitterY,
      z: lobe * 38 + (b - 0.5) * 75,
    };
  }

  const radius = Math.pow(b, 0.62) * 136;
  return {
    x: Math.cos(a) * radius + jitterX,
    y: Math.sin(a) * radius * 0.78 + jitterY,
    z: Math.sin(a * 1.6) * 74,
  };
}

function classifyRepo(name) {
  const lower = name.toLowerCase();
  const [owner = "", repo = ""] = lower.split("/");

  for (const region of atlasRegions) {
    if (region.id === "other") continue;
    if (region.orgs.some((org) => owner === org || owner.includes(org))) return region.id;
    if (region.keywords.some((keyword) => repo.includes(keyword) || lower.includes(`-${keyword}`))) {
      return region.id;
    }
  }

  const primaryRegions = atlasRegions.filter((region) => region.id !== "other");
  const hash = hashString(name);
  if (hash % 10 === 0) return "other";
  return primaryRegions[hash % primaryRegions.length].id;
}

function rotatePoint(point) {
  const cosY = Math.cos(camera.rotY);
  const sinY = Math.sin(camera.rotY);
  const cosX = Math.cos(camera.rotX);
  const sinX = Math.sin(camera.rotX);

  const xzX = point.x * cosY - point.z * sinY;
  const xzZ = point.x * sinY + point.z * cosY;
  const yzY = point.y * cosX - xzZ * sinX;
  const yzZ = point.y * sinX + xzZ * cosX;

  return { x: xzX, y: yzY, z: yzZ };
}

function projectPoint(point) {
  const rotated = rotatePoint(point);
  const perspective = 960;
  const depth = perspective / Math.max(120, perspective + rotated.z + 420);
  const viewportScale = Math.min(width / 1180, height / 720) * 1.45;
  const scale = camera.zoom * viewportScale * depth;
  return {
    x: width * 0.5 + camera.panX + rotated.x * scale,
    y: height * 0.52 + camera.panY + rotated.y * scale,
    depth: rotated.z,
    scale,
  };
}

function projectRepo(repo) {
  if (viewMode !== "galaxy") {
    repo.x = repo.sx;
    repo.y = repo.sy;
    repo.depth = 0;
    repo.scale = 1;
    return { x: repo.x, y: repo.y, depth: 0, scale: 1 };
  }

  const projected = projectPoint({ x: repo.wx, y: repo.wy, z: repo.wz });
  repo.x = projected.x;
  repo.y = projected.y;
  repo.depth = projected.depth;
  repo.scale = projected.scale;
  return projected;
}

function getRepo(name) {
  if (repoNodes.has(name)) return repoNodes.get(name);

  if (repoNodes.size >= MAX_REPOS) {
    const dimmest = [...repoNodes.values()].sort((a, b) => a.energy - b.energy)[0];
    if (dimmest) {
      repoNodes.delete(dimmest.name);
      updateRepoCount();
    }
  }

  const repo = {
    name,
    regionId: classifyRepo(name),
    x: width / 2,
    y: height / 2,
    sx: width / 2,
    sy: height / 2,
    wx: 0,
    wy: 0,
    wz: 0,
    depth: 0,
    scale: 1,
    energy: 0,
    pulse: 0,
    lastEvent: null,
    visible: false,
  };
  placeRepo(repo);
  repoNodes.set(name, repo);
  return repo;
}

function updateRepoCount() {
  let visible = 0;
  for (const repo of repoNodes.values()) {
    if (repo.visible) visible += 1;
  }
  repoCount.textContent = visible.toLocaleString();
}

function normalizeEvent(event) {
  const repo = event.repo?.name || event.repo || "unknown/repository";
  const actor = event.actor?.login || event.actor || "unknown";
  return {
    id: event.id || `${Date.now()}-${Math.random()}`,
    type: event.type || "PushEvent",
    repo,
    actor,
    avatar: event.actor?.avatar_url || "",
    createdAt: event.created_at || new Date().toISOString(),
  };
}

function enqueueEvents(events, source = "live") {
  const fresh = [];
  for (const event of events.map(normalizeEvent).reverse()) {
    if (seenEvents.has(event.id)) continue;
    seenEvents.add(event.id);
    fresh.push(event);
  }

  if (!fresh.length) return;

  eventQueue.push(...fresh);
  trimEventQueue();
  replayDeck.push(...fresh);
  if (replayDeck.length > 360) replayDeck.splice(0, replayDeck.length - 360);
  totalEvents += fresh.length;
  eventCount.textContent = totalEvents.toLocaleString();
  signalStatus.textContent = source;
}

async function fetchEvents() {
  if (mode === "quiet") return;

  try {
    signalStatus.textContent = "syncing";
    const result = await requestGithubEvents();
    schedulePoll(Math.max(45, result.pollInterval) * 1000);

    if (result.status === 304) {
      signalStatus.textContent = "steady";
      return;
    }

    const events = Array.isArray(result.events) ? result.events : [];
    if (events.length > 0) {
      enqueueEvents(events, result.source);
      updateDock(events.slice(0, 4).map(normalizeEvent));
      return;
    }

    if (result.source === "local") {
      const fallbackEvents = createFallbackEvents(36);
      enqueueEvents(fallbackEvents, "local");
      updateDock(fallbackEvents.slice(0, 4).map(normalizeEvent));
    }
  } catch (error) {
    signalStatus.textContent = "local";
    schedulePoll(90000);
    if (replayDeck.length === 0) {
      enqueueEvents(createFallbackEvents(36), "local");
    }
  }
}

async function requestGithubEvents() {
  const errors = [];

  for (const url of API_URLS) {
    try {
      const headers = {
        Accept: "application/vnd.github+json",
      };
      if (etag) headers["If-None-Match"] = etag;

      const response = await fetch(url, { headers });
      lastFetchAt = Date.now();

      const nextEtag = response.headers.get("etag");
      if (nextEtag) etag = nextEtag;

      const pollInterval = Number(response.headers.get("x-poll-interval")) || 60;
      if (response.status === 304) {
        return { status: 304, source: "steady", pollInterval, events: [] };
      }

      if (!response.ok) {
        throw new Error(`${url} returned ${response.status}`);
      }

      const events = await response.json();
      const source = response.headers.get("x-starfall-source") || (url.startsWith("/api/") ? "proxy" : "live");
      return {
        status: response.status,
        source,
        pollInterval,
        events,
      };
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.join(" / "));
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  pollTimer = window.setTimeout(fetchEvents, delay);
}

function createFallbackEvents(count = 12) {
  const types = getRenderableTypes();
  const repos = getFallbackReposForActiveRegion();
  return Array.from({ length: count }, (_, index) => {
    const repo = repos[Math.floor(Math.random() * repos.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const actor = fallbackActors[Math.floor(Math.random() * fallbackActors.length)];
    return {
      id: `fallback-${Date.now()}-${index}-${Math.random()}`,
      type,
      repo: { name: repo },
      actor: { login: actor, avatar_url: "" },
      created_at: new Date().toISOString(),
    };
  });
}

function trimEventQueue() {
  if (eventQueue.length > 600) {
    eventQueue.splice(0, eventQueue.length - 600);
  }
}

function getRenderableTypes() {
  const available = Object.keys(eventVisuals).filter((type) => type !== "default");
  const filtered = available.filter((type) => enabledTypes.has(type));
  if (filtered.length > 0) return filtered;
  return enabledTypes.has("default") ? ["PublicEvent"] : ["PushEvent"];
}

function getFallbackReposForActiveRegion() {
  if (viewMode !== "galaxy" || activeRegion === "all") return fallbackRepos;
  const matching = fallbackRepos.filter((repo) => classifyRepo(repo) === activeRegion);
  if (matching.length > 0) return matching;
  return [fallbackRepoForRegion(activeRegion)];
}

function fallbackRepoForRegion(regionId) {
  const examples = {
    ml: "openai/openai-node",
    frontend: "vercel/next.js",
    infra: "kubernetes/kubernetes",
    devtools: "microsoft/vscode",
    data: "duckdb/duckdb",
    security: "openssl/openssl",
    mobile: "flutter/flutter",
    systems: "rust-lang/rust",
    other: "octocat/hello-world",
  };
  return examples[regionId] || "octocat/hello-world";
}

function spawnFromQueue(now) {
  if (now - lastSpawn < spawnInterval) return;
  lastSpawn = now;

  if (mode === "quiet") return;

  if (eventQueue.length === 0 && replayDeck.length && Date.now() - lastFetchAt > 14000) {
    eventQueue.push(createReplayEvent());
  }

  const event = dequeueRenderableEvent();
  if (!event) {
    eventQueue.push(...createFallbackEvents(4).map(normalizeEvent));
    trimEventQueue();
    signalStatus.textContent = "filtered";
    return;
  }

  spawnEventVisual(event);
  updateDock([event]);
}

function dequeueRenderableEvent() {
  const index = eventQueue.findIndex((event) => isEventEnabled(event));
  if (index >= 0) {
    const [event] = eventQueue.splice(index, 1);
    return event;
  }

  return null;
}

function createReplayEvent() {
  const candidates = replayDeck.filter((event) => isEventEnabled(event));
  const source = candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : normalizeEvent(createFallbackEvents(1)[0]);

  return {
    ...source,
    id: `replay-${Date.now()}-${Math.random()}`,
  };
}

function isEventEnabled(event) {
  if (!event) return false;
  if (viewMode === "galaxy" && activeRegion !== "all" && classifyRepo(event.repo) !== activeRegion) return false;
  if (enabledTypes.has(event.type)) return true;
  const hasSpecificFilter = filterButtons.some((button) => button.dataset.filter === event.type);
  if (hasSpecificFilter) return false;
  return enabledTypes.has("default");
}

function spawnEventVisual(event) {
  if (event.type === "ReleaseEvent") {
    spawnSupernova(event);
    return;
  }

  if (event.type === "CreateEvent") {
    spawnConstellationIgnition(event);
    return;
  }

  spawnMeteor(event);
}

function spawnMeteor(event) {
  const repo = getRepo(event.repo);
  const visual = eventVisuals[event.type] || eventVisuals.default;
  const sideSeed = hashString(`${event.id}-${event.repo}`);
  const target = projectRepo(repo);
  const edge = sideSeed % 4;
  let startX = 0;
  let startY = 0;

  if (edge === 0) {
    startX = Math.random() * width;
    startY = -40;
  } else if (edge === 1) {
    startX = width + 40;
    startY = Math.random() * height;
  } else if (edge === 2) {
    startX = Math.random() * width;
    startY = height + 40;
  } else {
    startX = -40;
    startY = Math.random() * height;
  }

  meteors.push({
    event,
    repo,
    visual,
    x: startX,
    y: startY,
    sx: startX,
    sy: startY,
    ox: (Math.random() - 0.5) * 22,
    oy: (Math.random() - 0.5) * 22,
    tx: target.x,
    ty: target.y,
    age: 0,
    life: 1300 + Math.random() * 900,
    curve: (Math.random() - 0.5) * (eventVisuals[event.type] ? 180 : 400),
    landed: false,
  });

  if (meteors.length > MAX_METEORS) meteors.shift();
}

function spawnSupernova(event) {
  const repo = getRepo(event.repo);
  const visual = eventVisuals[event.type] || eventVisuals.default;
  const target = projectRepo(repo);
  markRepoImpact(repo, event, 54, 1.9);
  createBurst(target.x, target.y, visual.color, event.type);
  phenomena.push({
    kind: "supernova",
    event,
    repo,
    color: visual.color,
    age: 0,
    life: 1900,
    rotation: Math.random() * Math.PI,
  });
  trimPhenomena();
}

function spawnConstellationIgnition(event) {
  const repo = getRepo(event.repo);
  const visual = eventVisuals[event.type] || eventVisuals.default;
  const seed = hashString(`${event.id}-${event.repo}-create`);
  const nodes = Array.from({ length: 4 }, (_, index) => {
    const angle = (seed % 628) / 100 + index * 1.48 + Math.random() * 0.28;
    const length = 24 + ((seed >>> (index * 4)) % 34);
    return {
      angle,
      length,
      delay: index * 0.12,
    };
  });

  markRepoImpact(repo, event, 34, 1.55);
  phenomena.push({
    kind: "ignition",
    event,
    repo,
    color: visual.color,
    age: 0,
    life: 2300,
    nodes,
  });
  trimPhenomena();
}

function trimPhenomena() {
  if (phenomena.length > MAX_PHENOMENA) {
    phenomena.splice(0, phenomena.length - MAX_PHENOMENA);
  }
}

function markRepoImpact(repo, event, energyBoost = 12, pulse = 1) {
  const wasHidden = !repo.visible;
  repo.visible = true;
  repo.energy = Math.min(98, repo.energy + energyBoost);
  repo.pulse = Math.max(repo.pulse, pulse);
  repo.lastEvent = event;
  if (wasHidden) updateRepoCount();
}

function createBurst(x, y, color, type) {
  const count = type === "ReleaseEvent" ? 34 : type === "WatchEvent" ? 18 : 11;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.45 + Math.random() * (type === "ReleaseEvent" ? 4.6 : 2.6);
    bursts.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      life: 500 + Math.random() * 600,
      radius: 1 + Math.random() * 2.2,
      color,
    });
  }
  if (bursts.length > MAX_BURSTS) bursts.splice(0, bursts.length - MAX_BURSTS);
}

function updateDock(events) {
  if (!events.length) return;

  const existing = [...eventDock.querySelectorAll(".event-row:not(.is-empty)")];
  for (const event of events.slice(0, 1)) {
    const visual = eventVisuals[event.type] || eventVisuals.default;
    const row = document.createElement("article");
    row.className = "event-row";
    const avatar = escapeAttribute(event.avatar || fallbackAvatar(event.actor, visual.color));
    row.innerHTML = `
      <img src="${avatar}" alt="" />
      <div>
        <strong>${escapeHtml(event.repo)}</strong>
        <span>${visual.label} by ${escapeHtml(event.actor)}</span>
      </div>
    `;
    eventDock.prepend(row);
  }

  for (const empty of eventDock.querySelectorAll(".is-empty")) empty.remove();
  [...eventDock.querySelectorAll(".event-row")].slice(4).forEach((row) => row.remove());
  existing.slice(3).forEach((row) => row.remove());
}

function fallbackAvatar(actor, color) {
  const encodedColor = encodeURIComponent(color);
  const initial = encodeURIComponent((actor || "?").slice(0, 1).toUpperCase());
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23050604'/%3E%3Ccircle cx='40' cy='40' r='26' fill='${encodedColor}' fill-opacity='.26'/%3E%3Ctext x='40' y='49' text-anchor='middle' font-family='Arial' font-size='28' fill='%23f4f2e8'%3E${initial}%3C/text%3E%3C/svg%3E`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function drawStars(time) {
  for (const star of stars) {
    const alpha = star.glow + Math.sin(time / 900 + star.phase) * 0.06;
    const parallax = viewMode === "galaxy" ? 0.04 + star.r * 0.08 : 0;
    const x = wrap(star.x + camera.panX * parallax, -8, width + 8);
    const y = wrap(star.y + camera.panY * parallax, -8, height + 8);
    ctx.beginPath();
    ctx.fillStyle = `rgba(244, 242, 232, ${alpha})`;
    ctx.arc(x, y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function wrap(value, min, max) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

function isRegionVisible(regionId) {
  return viewMode !== "galaxy" || activeRegion === "all" || activeRegion === regionId;
}

function drawRegions(time) {
  if (viewMode !== "galaxy") return;

  const projectedRegions = atlasRegions
    .map((region) => ({ region, projected: projectPoint(region.center) }))
    .sort((a, b) => a.projected.depth - b.projected.depth);

  for (const { region, projected } of projectedRegions) {
    const isActive = isRegionVisible(region.id);
    const alpha = region.id === "other" ? 0.14 : isActive ? 0.34 : 0.055;
    const pulse = 1 + Math.sin(time / 1300 + region.center.x) * 0.04;
    const radius = Math.max(1, (132 + (region.id === "other" ? 30 : 0)) * projected.scale * pulse);

    ctx.beginPath();
    const glow = ctx.createRadialGradient(
      projected.x,
      projected.y,
      0,
      projected.x,
      projected.y,
      radius,
    );
    glow.addColorStop(0, hexToRgba(region.color, alpha));
    glow.addColorStop(1, `${region.color}00`);
    ctx.fillStyle = glow;
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.fill();

    drawRegionDust(region, projected, radius, isActive, time);
    drawRegionOrbitals(region, projected, radius, isActive, time);

    if (projected.scale > 0.45 && region.id !== "other") {
      let labelX = clamp(projected.x, 138, width - 118);
      let labelY = clamp(projected.y - radius * 0.48, 126, height - 84);
      if (labelX < 330 && labelY < 164) {
        labelX = 330;
        labelY = 164;
      }
      ctx.fillStyle = `rgba(244, 242, 232, ${isActive ? 0.78 : 0.28})`;
      ctx.font = "650 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(region.label, labelX, labelY);
    }
  }
}

function drawRegionDust(region, projected, radius, isActive, time) {
  const hash = hashString(region.id);
  const count = region.id === "other" ? 20 : 30;
  for (let i = 0; i < count; i += 1) {
    const seed = hashString(`${region.id}-${i}-${hash}`);
    const drift = time / (42000 + (seed % 18000));
    const offset = regionOffset(region, seed);
    const x = projected.x + offset.x * projected.scale + Math.cos(drift + seed) * 2.2;
    const y = projected.y + offset.y * projected.scale + Math.sin(drift + seed) * 2.2;
    const dot = Math.max(0.2, (0.55 + ((seed >>> 11) % 8) / 10) * projected.scale);
    const alpha = (isActive ? 0.38 : 0.12) * (0.55 + ((seed >>> 20) % 40) / 100);

    ctx.beginPath();
    ctx.fillStyle = hexToRgba(region.color, alpha);
    ctx.arc(x, y, dot, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRegionOrbitals(region, projected, radius, isActive, time) {
  const orbitCount = region.id === "other" ? 1 : 2;
  const alpha = isActive ? 0.18 : 0.045;
  ctx.save();
  ctx.translate(projected.x, projected.y);
  ctx.rotate(((hashString(region.id) % 80) - 40) / 100 + time / 42000);
  ctx.scale(projected.scale, projected.scale);

  if (region.layout === "spiral") {
    for (let arm = 0; arm < 3; arm += 1) {
      ctx.beginPath();
      ctx.strokeStyle = hexToRgba(region.color, alpha);
      ctx.lineWidth = 1 / Math.max(0.6, projected.scale);
      for (let step = 0; step < 34; step += 1) {
        const t = step / 33;
        const angle = t * 5.4 + arm * 2.09;
        const r = 22 + t * 132;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r * 0.72;
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (region.layout === "lattice") {
    ctx.strokeStyle = hexToRgba(region.color, alpha);
    ctx.lineWidth = 1 / Math.max(0.6, projected.scale);
    for (let x = -96; x <= 96; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, -68);
      ctx.lineTo(x, 68);
      ctx.stroke();
    }
    for (let y = -63; y <= 63; y += 42) {
      ctx.beginPath();
      ctx.moveTo(-112, y);
      ctx.lineTo(112, y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (region.layout === "chain") {
    ctx.strokeStyle = hexToRgba(region.color, alpha);
    ctx.lineWidth = 1 / Math.max(0.6, projected.scale);
    ctx.beginPath();
    for (let step = 0; step < 30; step += 1) {
      const t = step / 29;
      const x = (t - 0.5) * 260;
      const y = Math.sin(t * Math.PI * 3) * 34;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  for (let i = 0; i < orbitCount; i += 1) {
    const orbitRadius = (region.layout === "ring" || region.layout === "rim" ? 92 : radius / projected.scale) * (0.42 + i * 0.22);
    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(region.color, Math.max(0.025, alpha - i * 0.04));
    ctx.lineWidth = 1 / Math.max(0.6, projected.scale);
    ctx.ellipse(0, 0, orbitRadius, orbitRadius * (0.34 + i * 0.09), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRepos(dt) {
  hoveredRepo = null;
  let closest = 18;
  const visibleRepos = [...repoNodes.values()]
    .filter((repo) => repo.visible)
    .map((repo) => {
      projectRepo(repo);
      return repo;
    })
    .sort((a, b) => a.depth - b.depth);

  for (const repo of visibleRepos) {
    repo.energy = Math.max(0, repo.energy - dt * 0.011);
    repo.pulse = Math.max(0, repo.pulse - dt * 0.0024);
    const region = atlasRegionMap.get(repo.regionId) || atlasRegionMap.get("other");
    const inFocus = isRegionVisible(repo.regionId);
    const isGalaxy = viewMode === "galaxy";
    const color = isGalaxy ? region.color : eventVisuals[repo.lastEvent?.type]?.color || eventVisuals.default.color;
    const radius = (isGalaxy ? 2.2 + Math.sqrt(repo.energy) * 0.52 + repo.pulse * 8 : 2.4 + Math.sqrt(repo.energy) * 0.52 + repo.pulse * 8) * repo.scale;
    const alpha = (isGalaxy ? 0.18 + Math.min(0.62, repo.energy / 100) : 0.23 + Math.min(0.55, repo.energy / 100)) * (inFocus ? 1 : 0.22);

    ctx.beginPath();
    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.arc(repo.x, repo.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(color, 0.05 + alpha * 0.25);
    ctx.lineWidth = 1;
    ctx.arc(repo.x, repo.y, radius * 3.2, 0, Math.PI * 2);
    ctx.stroke();

    const distance = Math.hypot(pointer.x - repo.x, pointer.y - repo.y);
    if (inFocus && distance < closest + Math.max(radius, 7)) {
      closest = distance;
      hoveredRepo = repo;
    }
  }
}

function hexToRgba(hex, alpha) {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    meteor.age += dt;
    const t = clamp(meteor.age / meteor.life, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const target = projectRepo(meteor.repo);
    meteor.tx = target.x + meteor.ox;
    meteor.ty = target.y + meteor.oy;
    const midX = (meteor.sx + meteor.tx) / 2 + meteor.curve;
    const midY = (meteor.sy + meteor.ty) / 2 - Math.abs(meteor.curve) * 0.35;

    const x1 = lerp(meteor.sx, midX, eased);
    const y1 = lerp(meteor.sy, midY, eased);
    const x2 = lerp(midX, meteor.tx, eased);
    const y2 = lerp(midY, meteor.ty, eased);
    meteor.x = lerp(x1, x2, eased);
    meteor.y = lerp(y1, y2, eased);

    const alpha = Math.sin(t * Math.PI);
    const isArcEvent = !eventVisuals[meteor.event.type];

    if (isArcEvent) {
      const partialCx = lerp(meteor.sx, midX, eased);
      const partialCy = lerp(meteor.sy, midY, eased);
      const trailAlpha = Math.round(alpha * 0.65 * 255).toString(16).padStart(2, "0");
      ctx.beginPath();
      ctx.moveTo(meteor.sx, meteor.sy);
      ctx.quadraticCurveTo(partialCx, partialCy, meteor.x, meteor.y);
      ctx.strokeStyle = meteor.visual.color + trailAlpha;
      ctx.lineWidth = 1.2 + meteor.visual.radius * 0.38;
      ctx.stroke();
    } else {
      const tail = 34 + meteor.visual.trail * 78;
      const dx = meteor.x - x1;
      const dy = meteor.y - y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const tailX = meteor.x - (dx / len) * tail;
      const tailY = meteor.y - (dy / len) * tail;
      const gradient = ctx.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
      gradient.addColorStop(0, `${meteor.visual.color}00`);
      gradient.addColorStop(1, meteor.visual.color);
      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.4 + meteor.visual.radius * 0.42;
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(meteor.x, meteor.y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = meteor.visual.color;
    ctx.globalAlpha = alpha;
    ctx.arc(meteor.x, meteor.y, meteor.visual.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (meteor.event.type === "ForkEvent" && t > 0.52) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(120, 215, 255, 0.22)";
      ctx.lineWidth = 1;
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(meteor.x + Math.sin(t * 7) * 42, meteor.y + Math.cos(t * 5) * 32);
      ctx.stroke();
    }

    if (t >= 1) {
      if (!meteor.landed) {
        markRepoImpact(meteor.repo, meteor.event);
        const center = projectRepo(meteor.repo);
        createBurst(center.x, center.y, meteor.visual.color, meteor.event.type);
        meteor.landed = true;
      }
      meteors.splice(i, 1);
    }
  }
}

function drawPhenomena(dt) {
  for (let i = phenomena.length - 1; i >= 0; i -= 1) {
    const effect = phenomena[i];
    effect.age += dt;
    const t = clamp(effect.age / effect.life, 0, 1);
    const alpha = 1 - t;

    if (effect.kind === "supernova") {
      drawSupernova(effect, t, alpha);
    } else if (effect.kind === "ignition") {
      drawConstellationIgnition(effect, t, alpha);
    }

    if (t >= 1) {
      phenomena.splice(i, 1);
    }
  }
}

function drawSupernova(effect, t, alpha) {
  const projected = projectRepo(effect.repo);
  const core = 5 + Math.sin(t * Math.PI) * 13;
  const ringOne = (18 + t * 72) * projected.scale;
  const ringTwo = (8 + t * 118) * projected.scale;

  ctx.save();
  ctx.translate(projected.x, projected.y);
  ctx.rotate(effect.rotation + t * 0.6);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, ringTwo));
  glow.addColorStop(0, `${effect.color}dd`);
  glow.addColorStop(0.22, `${effect.color}55`);
  glow.addColorStop(1, `${effect.color}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, ringTwo, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(214, 239, 127, ${0.72 * alpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, ringOne, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(244, 242, 232, ${0.46 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, ringTwo, 0, Math.PI * 2);
  ctx.stroke();

  for (let arm = 0; arm < 6; arm += 1) {
    const angle = (Math.PI * 2 * arm) / 6;
    const length = (22 + t * 80) * projected.scale;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(214, 239, 127, ${0.48 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.moveTo(Math.cos(angle) * core, Math.sin(angle) * core);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle = effect.color;
  ctx.arc(0, 0, core * projected.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConstellationIgnition(effect, t, alpha) {
  const projected = projectRepo(effect.repo);
  ctx.save();
  ctx.translate(projected.x, projected.y);

  ctx.strokeStyle = `rgba(204, 233, 139, ${0.32 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, (14 + t * 24) * projected.scale, 0, Math.PI * 2);
  ctx.stroke();

  for (const node of effect.nodes) {
    const localT = clamp((t - node.delay) / 0.42, 0, 1);
    if (localT <= 0) continue;

    const eased = 1 - Math.pow(1 - localT, 3);
    const x = Math.cos(node.angle) * node.length * eased * projected.scale;
    const y = Math.sin(node.angle) * node.length * eased * projected.scale;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(204, 233, 139, ${0.5 * alpha})`;
    ctx.lineWidth = 1;
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = effect.color;
    ctx.arc(x, y, (2.2 + localT * 1.5) * projected.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  const corePulse = 3 + Math.sin(t * Math.PI * 3) * 1.4;
  ctx.beginPath();
  ctx.fillStyle = effect.color;
  ctx.arc(0, 0, corePulse * projected.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i -= 1) {
    const burst = bursts[i];
    burst.age += dt;
    burst.x += burst.vx * dt * 0.055;
    burst.y += burst.vy * dt * 0.055;
    burst.vx *= 0.985;
    burst.vy *= 0.985;
    const alpha = 1 - burst.age / burst.life;
    if (alpha <= 0) {
      bursts.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = burst.color;
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function updateHoverCard() {
  if (!hoveredRepo || !hoveredRepo.lastEvent) {
    hoverCard.classList.remove("is-visible");
    updateSurfaceCursor();
    return;
  }

  const visual = eventVisuals[hoveredRepo.lastEvent.type] || eventVisuals.default;
  const region = atlasRegionMap.get(hoveredRepo.regionId) || atlasRegionMap.get("other");
  hoverType.textContent = visual.label;
  hoverRepo.textContent = hoveredRepo.name;
  hoverActor.textContent =
    viewMode === "galaxy"
      ? `${region.label} / ${hoveredRepo.lastEvent.actor} / click to open`
      : `Last seen from ${hoveredRepo.lastEvent.actor} / click to open`;
  hoverCard.style.transform = `translate(${clamp(pointer.x + 16, 12, width - 246)}px, ${clamp(pointer.y + 16, 12, height - 94)}px)`;
  hoverCard.classList.add("is-visible");
  updateSurfaceCursor();
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(48, now - lastFrame);
  lastFrame = now;

  spawnFromQueue(now);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(5, 6, 4, 0.54)";
  ctx.fillRect(0, 0, width, height);

  drawStars(now);
  drawRegions(now);
  drawRepos(dt);
  drawPhenomena(dt);
  drawMeteors(dt);
  drawBursts(dt);
  updateHoverCard();

  requestAnimationFrame(frame);
}

function setViewMode(nextViewMode) {
  viewMode = nextViewMode;
  appShell.classList.toggle("is-galaxy", viewMode === "galaxy");
  for (const button of viewButtons) {
    button.classList.toggle("is-active", button.dataset.view === viewMode);
  }
  appKicker.textContent = viewMode === "galaxy" ? "GitHub code atlas" : "GitHub activity";
  appLede.textContent =
    viewMode === "galaxy"
      ? "Open-source activity, mapped into a navigable code galaxy."
      : "Open-source activity, rendered as a live meteor field.";

  hoveredRepo = null;
  dragState = null;
  camera.panX = 0;
  camera.panY = 0;

  if (viewMode === "galaxy") {
    setRegion(activeRegion);
  } else {
    camera.rotX = -0.18;
    camera.rotY = 0.34;
    camera.zoom = 1.2;
  }

  updateSurfaceCursor();
}

function setMode(nextMode) {
  mode = nextMode;
  for (const button of modeButtons) {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  }

  if (mode === "quiet") {
    signalStatus.textContent = "quiet";
    eventQueue.length = 0;
  } else {
    fetchEvents();
  }
}

function setDensity(nextDensity) {
  activeDensity = nextDensity;
  spawnInterval = DENSITY_MS[activeDensity] || DENSITY_MS.normal;
  for (const button of densityButtons) {
    button.classList.toggle("is-active", button.dataset.density === activeDensity);
  }
}

function setRegion(nextRegion) {
  activeRegion = nextRegion;
  for (const button of regionButtons) {
    button.classList.toggle("is-active", button.dataset.region === activeRegion);
  }

  if (activeRegion === "all") {
    camera.zoom = Math.max(0.9, Math.min(camera.zoom, 1.15));
    camera.panX = 0;
    camera.panY = 0;
    return;
  }

  const region = atlasRegionMap.get(activeRegion);
  if (!region) return;
  camera.zoom = Math.max(camera.zoom, 1.24);
  camera.rotY = Math.atan2(region.center.x, region.center.z + 520) * -0.65;
  camera.rotX = clamp(region.center.y / 900, -0.45, 0.45);
  camera.panX = 0;
  camera.panY = 0;
}

function resetSky() {
  meteors.length = 0;
  bursts.length = 0;
  phenomena.length = 0;
  eventQueue.length = 0;
  repoNodes.clear();
  hoveredRepo = null;
  repoCount.textContent = "0";
  eventDock.innerHTML = `
    <article class="event-row is-empty">
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23111410'/%3E%3Ccircle cx='40' cy='40' r='20' fill='%238ff0c8' fill-opacity='.35'/%3E%3C/svg%3E"
        alt=""
      />
      <div>
        <strong>Sky cleared</strong>
        <span>New events will begin landing here.</span>
      </div>
    </article>
  `;
}

function isInteractiveTarget(target) {
  return Boolean(target.closest("button, a, input, textarea, select"));
}

function updateSurfaceCursor() {
  if (dragState) {
    canvas.style.cursor = "grabbing";
  } else if (hoveredRepo) {
    canvas.style.cursor = "pointer";
  } else if (viewMode === "galaxy") {
    canvas.style.cursor = "grab";
  } else {
    canvas.style.cursor = "default";
  }
}

function beginDrag(event) {
  if (isInteractiveTarget(event.target)) return;
  if (viewMode !== "galaxy" || hoveredRepo) return;
  event.preventDefault();
  pointer = { x: event.clientX, y: event.clientY };
  dragState = {
    x: event.clientX,
    y: event.clientY,
    panX: camera.panX,
    panY: camera.panY,
    rotX: camera.rotX,
    rotY: camera.rotY,
    rotate: event.shiftKey,
    moved: false,
  };
  if (event.pointerId != null) appShell.setPointerCapture?.(event.pointerId);
  updateSurfaceCursor();
}

function moveDrag(event) {
  pointer = { x: event.clientX, y: event.clientY };
  if (!dragState) {
    updateSurfaceCursor();
    return;
  }

  event.preventDefault();
  const dx = event.clientX - dragState.x;
  const dy = event.clientY - dragState.y;
  if (dragState.rotate) {
    camera.rotY = dragState.rotY + dx * 0.0045;
    camera.rotX = clamp(dragState.rotX + dy * 0.0035, -0.82, 0.62);
  } else {
    camera.panX = dragState.panX + dx;
    camera.panY = dragState.panY + dy;
  }
  dragState.moved = dragState.moved || Math.hypot(dx, dy) > 5;
  updateSurfaceCursor();
}

function endDrag(event) {
  const wasDrag = dragState?.moved;
  dragState = null;
  updateSurfaceCursor();
  if (wasDrag || isInteractiveTarget(event.target)) return;
  if (!hoveredRepo?.name || !/^[\w.-]+\/[\w.-]+$/.test(hoveredRepo.name)) return;
  window.open(`https://github.com/${hoveredRepo.name}`, "_blank", "noopener,noreferrer");
}

function mouseToPointerEvent(event) {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    shiftKey: event.shiftKey,
    target: event.target,
    preventDefault: () => event.preventDefault(),
  };
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", moveDrag);
window.addEventListener("mousemove", (event) => {
  if (dragState) moveDrag(mouseToPointerEvent(event));
});
appShell.addEventListener("pointerleave", () => {
  pointer = { x: -999, y: -999 };
  dragState = null;
  updateSurfaceCursor();
});
appShell.addEventListener("pointerdown", beginDrag);
appShell.addEventListener("pointerup", endDrag);
window.addEventListener("pointerup", endDrag);
appShell.addEventListener("mousedown", (event) => beginDrag(mouseToPointerEvent(event)));
window.addEventListener("mouseup", (event) => endDrag(mouseToPointerEvent(event)));
appShell.addEventListener(
  "wheel",
  (event) => {
    if (viewMode !== "galaxy") return;
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    const previousZoom = camera.zoom;
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    camera.zoom = clamp(camera.zoom + delta, 0.58, 2.15);
    const zoomRatio = camera.zoom / previousZoom;
    camera.panX = event.clientX - width * 0.5 - (event.clientX - width * 0.5 - camera.panX) * zoomRatio;
    camera.panY = event.clientY - height * 0.52 - (event.clientY - height * 0.52 - camera.panY) * zoomRatio;
  },
  { passive: false },
);

for (const button of modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}

for (const button of viewButtons) {
  button.addEventListener("click", () => setViewMode(button.dataset.view));
}

for (const button of densityButtons) {
  button.addEventListener("click", () => setDensity(button.dataset.density));
}

for (const button of regionButtons) {
  button.addEventListener("click", () => setRegion(button.dataset.region));
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    const type = button.dataset.filter;
    if (enabledTypes.has(type)) {
      enabledTypes.delete(type);
      button.classList.remove("is-active");
    } else {
      enabledTypes.add(type);
      button.classList.add("is-active");
    }
  });
}

clearSky.addEventListener("click", resetSky);

resize();
setViewMode(viewMode);
fetchEvents();
requestAnimationFrame(frame);

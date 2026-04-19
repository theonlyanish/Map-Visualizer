const canvas = document.querySelector("#sky");
const ctx = canvas.getContext("2d", { alpha: true });

const signalStatus = document.querySelector("#signalStatus");
const eventCount = document.querySelector("#eventCount");
const repoCount = document.querySelector("#repoCount");
const eventDock = document.querySelector("#eventDock");
const hoverCard = document.querySelector("#hoverCard");
const hoverType = document.querySelector("#hoverType");
const hoverRepo = document.querySelector("#hoverRepo");
const hoverActor = document.querySelector("#hoverActor");
const modeButtons = [...document.querySelectorAll(".mode-button[data-mode]")];
const densityButtons = [...document.querySelectorAll(".density-button")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const clearSky = document.querySelector("#clearSky");

const API_URL = "https://api.github.com/events?per_page=100";
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
  const count = Math.floor((width * height) / 10500);
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
  const band = (hash % 1000) / 1000;
  const angle = (hash % 6283) / 1000;
  const centerBias = Math.sin(band * Math.PI);
  const rx = width * (0.18 + centerBias * 0.32);
  const ry = height * (0.16 + centerBias * 0.3);
  repo.x = width * 0.54 + Math.cos(angle) * rx + (((hash >> 8) % 100) - 50);
  repo.y = height * 0.52 + Math.sin(angle) * ry + (((hash >> 16) % 100) - 50);
  repo.x = clamp(repo.x, 42, width - 42);
  repo.y = clamp(repo.y, 92, height - 88);
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
    x: width / 2,
    y: height / 2,
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
  replayDeck.push(...fresh);
  if (replayDeck.length > 360) replayDeck.splice(0, replayDeck.length - 360);
  totalEvents += fresh.length;
  eventCount.textContent = totalEvents.toLocaleString();
  signalStatus.textContent = source === "live" ? "live" : "offline";
}

async function fetchEvents() {
  if (mode === "quiet") return;

  const headers = {
    Accept: "application/vnd.github+json",
  };
  if (etag) headers["If-None-Match"] = etag;

  try {
    signalStatus.textContent = "syncing";
    const response = await fetch(API_URL, { headers });
    lastFetchAt = Date.now();

    const nextEtag = response.headers.get("etag");
    if (nextEtag) etag = nextEtag;

    const pollInterval = Number(response.headers.get("x-poll-interval")) || 60;
    schedulePoll(Math.max(45, pollInterval) * 1000);

    if (response.status === 304) {
      signalStatus.textContent = "steady";
      return;
    }

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const events = await response.json();
    enqueueEvents(events, "live");
    updateDock(events.slice(0, 4).map(normalizeEvent));
  } catch (error) {
    signalStatus.textContent = "offline";
    schedulePoll(90000);
    if (replayDeck.length === 0) {
      enqueueEvents(createFallbackEvents(36), "fallback");
    }
  }
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  pollTimer = window.setTimeout(fetchEvents, delay);
}

function createFallbackEvents(count = 12) {
  const types = Object.keys(eventVisuals).filter((type) => type !== "default");
  return Array.from({ length: count }, (_, index) => {
    const repo = fallbackRepos[Math.floor(Math.random() * fallbackRepos.length)];
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

function spawnFromQueue(now) {
  if (now - lastSpawn < spawnInterval) return;
  lastSpawn = now;

  if (mode === "quiet") return;

  if (eventQueue.length === 0) {
    if (replayDeck.length && Date.now() - lastFetchAt > 14000) {
      const sample = replayDeck[Math.floor(Math.random() * replayDeck.length)];
      eventQueue.push({ ...sample, id: `replay-${Date.now()}-${Math.random()}` });
    }
  }

  const event = dequeueRenderableEvent();
  if (!event) return;

  spawnEventVisual(event);
  updateDock([event]);
}

function dequeueRenderableEvent() {
  let attempts = eventQueue.length;
  while (attempts > 0) {
    const event = eventQueue.shift();
    if (isEventEnabled(event)) return event;
    attempts -= 1;
  }
  return null;
}

function isEventEnabled(event) {
  if (!event) return false;
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
    tx: repo.x + (Math.random() - 0.5) * 22,
    ty: repo.y + (Math.random() - 0.5) * 22,
    age: 0,
    life: 1300 + Math.random() * 900,
    curve: (Math.random() - 0.5) * 180,
    landed: false,
  });

  if (meteors.length > MAX_METEORS) meteors.shift();
}

function spawnSupernova(event) {
  const repo = getRepo(event.repo);
  const visual = eventVisuals[event.type] || eventVisuals.default;
  markRepoImpact(repo, event, 54, 1.9);
  createBurst(repo.x, repo.y, visual.color, event.type);
  phenomena.push({
    kind: "supernova",
    event,
    repo,
    x: repo.x,
    y: repo.y,
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
    const length = 24 + ((seed >> (index * 4)) % 34);
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
    x: repo.x,
    y: repo.y,
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
    ctx.beginPath();
    ctx.fillStyle = `rgba(244, 242, 232, ${alpha})`;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRepos(dt) {
  hoveredRepo = null;
  let closest = 18;

  for (const repo of repoNodes.values()) {
    if (!repo.visible) continue;
    repo.energy = Math.max(0, repo.energy - dt * 0.011);
    repo.pulse = Math.max(0, repo.pulse - dt * 0.0024);
    const radius = 2.4 + Math.sqrt(repo.energy) * 0.52 + repo.pulse * 8;
    const alpha = 0.23 + Math.min(0.55, repo.energy / 100);

    ctx.beginPath();
    ctx.fillStyle = `rgba(143, 240, 200, ${alpha})`;
    ctx.arc(repo.x, repo.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = `rgba(143, 240, 200, ${0.05 + alpha * 0.25})`;
    ctx.lineWidth = 1;
    ctx.arc(repo.x, repo.y, radius * 3.2, 0, Math.PI * 2);
    ctx.stroke();

    const distance = Math.hypot(pointer.x - repo.x, pointer.y - repo.y);
    if (distance < closest + radius) {
      closest = distance;
      hoveredRepo = repo;
    }
  }
}

function drawMeteors(dt) {
  for (let i = meteors.length - 1; i >= 0; i -= 1) {
    const meteor = meteors[i];
    meteor.age += dt;
    const t = clamp(meteor.age / meteor.life, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const midX = (meteor.sx + meteor.tx) / 2 + meteor.curve;
    const midY = (meteor.sy + meteor.ty) / 2 - Math.abs(meteor.curve) * 0.35;

    const x1 = lerp(meteor.sx, midX, eased);
    const y1 = lerp(meteor.sy, midY, eased);
    const x2 = lerp(midX, meteor.tx, eased);
    const y2 = lerp(midY, meteor.ty, eased);
    meteor.x = lerp(x1, x2, eased);
    meteor.y = lerp(y1, y2, eased);

    const tail = 34 + meteor.visual.trail * 78;
    const dx = meteor.x - x1;
    const dy = meteor.y - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const tx = meteor.x - (dx / len) * tail;
    const ty = meteor.y - (dy / len) * tail;
    const alpha = Math.sin(t * Math.PI);

    const gradient = ctx.createLinearGradient(tx, ty, meteor.x, meteor.y);
    gradient.addColorStop(0, `${meteor.visual.color}00`);
    gradient.addColorStop(1, meteor.visual.color);

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.4 + meteor.visual.radius * 0.42;
    ctx.moveTo(tx, ty);
    ctx.lineTo(meteor.x, meteor.y);
    ctx.stroke();

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
        createBurst(meteor.tx, meteor.ty, meteor.visual.color, meteor.event.type);
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
  const core = 5 + Math.sin(t * Math.PI) * 13;
  const ringOne = 18 + t * 72;
  const ringTwo = 8 + t * 118;

  ctx.save();
  ctx.translate(effect.x, effect.y);
  ctx.rotate(effect.rotation + t * 0.6);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, ringTwo);
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
    const length = 22 + t * 80;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(214, 239, 127, ${0.48 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.moveTo(Math.cos(angle) * core, Math.sin(angle) * core);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle = effect.color;
  ctx.arc(0, 0, core, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConstellationIgnition(effect, t, alpha) {
  ctx.save();
  ctx.translate(effect.x, effect.y);

  ctx.strokeStyle = `rgba(204, 233, 139, ${0.32 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 14 + t * 24, 0, Math.PI * 2);
  ctx.stroke();

  for (const node of effect.nodes) {
    const localT = clamp((t - node.delay) / 0.42, 0, 1);
    if (localT <= 0) continue;

    const eased = 1 - Math.pow(1 - localT, 3);
    const x = Math.cos(node.angle) * node.length * eased;
    const y = Math.sin(node.angle) * node.length * eased;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(204, 233, 139, ${0.5 * alpha})`;
    ctx.lineWidth = 1;
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = effect.color;
    ctx.arc(x, y, 2.2 + localT * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const corePulse = 3 + Math.sin(t * Math.PI * 3) * 1.4;
  ctx.beginPath();
  ctx.fillStyle = effect.color;
  ctx.arc(0, 0, corePulse, 0, Math.PI * 2);
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
    canvas.style.cursor = "default";
    return;
  }

  const visual = eventVisuals[hoveredRepo.lastEvent.type] || eventVisuals.default;
  hoverType.textContent = visual.label;
  hoverRepo.textContent = hoveredRepo.name;
  hoverActor.textContent = `Last seen from ${hoveredRepo.lastEvent.actor} · click to open`;
  hoverCard.style.transform = `translate(${clamp(pointer.x + 16, 12, width - 246)}px, ${clamp(pointer.y + 16, 12, height - 94)}px)`;
  hoverCard.classList.add("is-visible");
  canvas.style.cursor = "pointer";
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
  drawRepos(dt);
  drawPhenomena(dt);
  drawMeteors(dt);
  drawBursts(dt);
  updateHoverCard();

  requestAnimationFrame(frame);
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

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer = { x: event.clientX, y: event.clientY };
  canvas.style.cursor = hoveredRepo ? "pointer" : "default";
});
window.addEventListener("pointerleave", () => {
  pointer = { x: -999, y: -999 };
  canvas.style.cursor = "default";
});
window.addEventListener("pointerdown", (event) => {
  if (event.target !== canvas) return;
  if (!hoveredRepo?.name || !/^[\w.-]+\/[\w.-]+$/.test(hoveredRepo.name)) return;
  window.open(`https://github.com/${hoveredRepo.name}`, "_blank", "noopener,noreferrer");
});

for (const button of modeButtons) {
  button.addEventListener("click", () => setMode(button.dataset.mode));
}

for (const button of densityButtons) {
  button.addEventListener("click", () => setDensity(button.dataset.density));
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
fetchEvents();
requestAnimationFrame(frame);

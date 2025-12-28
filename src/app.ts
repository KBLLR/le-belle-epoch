type Post = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  project?: string;
  voice_id?: string;
  published_at?: string;
  source_path?: string;
  url?: string;
};

type PostsPayload = {
  generated_at: string;
  posts: Post[];
};

type SystemRow = {
  resource: string;
  type: string;
  status: "ok" | "down" | "unknown";
  docs: string;
  updated: string;
  endpoint: string;
};

const fallbackPosts: PostsPayload = {
  generated_at: "2025-12-28T00:00:00Z",
  posts: [
    {
      id: "anthology-brief-001",
      title: "Anthology brief: what changed this week",
      summary: "Snapshot of new documents, system shifts, and active experiments.",
      tags: ["anthology", "summary"],
      project: "Anthology",
      voice_id: "kokoro_default",
      published_at: "2025-12-28"
    },
    {
      id: "voice-notes-002",
      title: "Voice notes: RAG maintenance signals",
      summary: "Covers collection health, sync gaps, and query thresholds.",
      tags: ["rag", "maintenance"],
      project: "mlx-services",
      voice_id: "kokoro_default",
      published_at: "2025-12-27"
    },
    {
      id: "generator-003",
      title: "Generator pipeline: markdown to posts.json",
      summary: "Outline of the static build flow and runtime overlays.",
      tags: ["blog", "pipeline"],
      project: "le-belle-epoch",
      voice_id: "kokoro_default",
      published_at: "2025-12-26"
    },
    {
      id: "systems-004",
      title: "System table: mlx-services alignment",
      summary: "Status boards for llm, rag, audio, and mcp endpoints.",
      tags: ["mlx", "status"],
      project: "mlx-services",
      voice_id: "kokoro_default",
      published_at: "2025-12-25"
    }
  ]
};

const getMeta = (name: string): string | null => {
  const tag = document.querySelector(`meta[name="${name}"]`);
  return tag?.getAttribute("content") || null;
};

const config = {
  ragBaseUrl: getMeta("rag-base-url") || "http://127.0.0.1:8011",
  llmBaseUrl: getMeta("llm-base-url") || "http://127.0.0.1:8080",
  audioBaseUrl: getMeta("audio-base-url") || "http://127.0.0.1:7001"
};

const qs = <T extends HTMLElement>(selector: string): T | null =>
  document.querySelector(selector) as T | null;

const heroTerminal = qs<HTMLPreElement>("#heroTerminal");
const headlineGrid = qs<HTMLDivElement>("#headlineGrid");
const postList = qs<HTMLDivElement>("#postList");
const systemTableBody = qs<HTMLDivElement>("#systemTableBody");
const chatTerminal = qs<HTMLPreElement>("#chatTerminal");
const chatFab = qs<HTMLButtonElement>("#chatFab");
const chatPanel = qs<HTMLElement>("#chatPanel");
const chatHistory = qs<HTMLDivElement>("#chatHistory");
const chatForm = qs<HTMLFormElement>("#chatForm");
const chatInput = qs<HTMLInputElement>("#chatInput");

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const setHeroTerminal = () => {
  if (!heroTerminal) return;
  const lines = [
    "le-belle-epoch boot",
    "- posts.json: ready",
    "- rag sync: pending",
    `- rag endpoint: ${config.ragBaseUrl}`,
    `- llm endpoint: ${config.llmBaseUrl}`,
    `- audio endpoint: ${config.audioBaseUrl}`,
    "- status: awaiting prompts"
  ];
  heroTerminal.textContent = lines.join("\n");
};

const setChatTerminal = () => {
  if (!chatTerminal) return;
  const lines = [
    "terminal feed",
    "- chat panel online",
    "- outline: headlines, briefs, status",
    "- prompt chain: inactive"
  ];
  chatTerminal.textContent = lines.join("\n");
};

const renderHeadlines = (posts: Post[]) => {
  if (!headlineGrid) return;
  headlineGrid.innerHTML = "";
  posts.slice(0, 4).forEach((post) => {
    const card = document.createElement("article");
    card.className = "headline-card";
    card.innerHTML = `
      <div class="geom muted">${post.project || "Anthology"}</div>
      <h3>${post.title}</h3>
      <p class="muted">${post.summary}</p>
      <div class="post-meta">
        <span>${formatDate(post.published_at)}</span>
        <span>${post.tags.join(" ")}</span>
      </div>
    `;
    headlineGrid.appendChild(card);
  });
};

const renderPosts = (posts: Post[]) => {
  if (!postList) return;
  postList.innerHTML = "";
  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";
    const tags = post.tags.length ? post.tags.join(" ") : "untagged";
    card.innerHTML = `
      <div class="post-meta">
        <span>${post.project || "Anthology"}</span>
        <span>${formatDate(post.published_at)}</span>
        <span>${tags}</span>
      </div>
      <h3>${post.title}</h3>
      <p class="muted">${post.summary}</p>
      <div class="post-meta">voice: ${post.voice_id || "kokoro_default"}</div>
    `;
    postList.appendChild(card);
  });
};

const renderTableRows = (rows: SystemRow[]) => {
  if (!systemTableBody) return;
  systemTableBody.innerHTML = "";
  rows.forEach((row) => {
    const el = document.createElement("div");
    el.className = "table-grid table-row";
    const statusClass = row.status === "ok" ? "ok" : row.status === "down" ? "down" : "";
    const statusLabel = row.status === "ok" ? "ok" : row.status === "down" ? "down" : "unknown";
    el.innerHTML = `
      <div>${row.resource}</div>
      <div>${row.type}</div>
      <div><span class="status-pill ${statusClass}">${statusLabel}</span></div>
      <div>${row.docs}</div>
      <div>${row.updated}</div>
      <div class="muted">${row.endpoint}</div>
    `;
    systemTableBody.appendChild(el);
  });
};

const fetchJson = async (url: string): Promise<{ ok: boolean; data?: any } > => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
};

const loadSystemRows = async (): Promise<SystemRow[]> => {
  const rows: SystemRow[] = [];

  const services = [
    { resource: "mlx-llm", type: "service", base: config.llmBaseUrl, health: "/health" },
    { resource: "mlx-rag", type: "service", base: config.ragBaseUrl, health: "/health" },
    { resource: "mlx-audio", type: "service", base: config.audioBaseUrl, health: "/health" }
  ];

  for (const service of services) {
    const health = await fetchJson(`${service.base}${service.health}`);
    rows.push({
      resource: service.resource,
      type: service.type,
      status: health.ok ? "ok" : "down",
      docs: "-",
      updated: "-",
      endpoint: service.base
    });
  }

  const collections = ["anthology", "blog", "projects"];
  for (const collection of collections) {
    const stats = await fetchJson(
      `${config.ragBaseUrl}/rag_stats?collection=${encodeURIComponent(collection)}`
    );
    const count = stats.ok
      ? String(stats.data?.count ?? stats.data?.documents ?? "-")
      : "-";
    const updated = stats.ok
      ? formatDate(stats.data?.updated_at || stats.data?.generated_at)
      : "-";
    rows.push({
      resource: `rag:${collection}`,
      type: "collection",
      status: stats.ok ? "ok" : "down",
      docs: count,
      updated,
      endpoint: `${config.ragBaseUrl}/rag_stats`
    });
  }

  return rows;
};

const loadPosts = async (): Promise<PostsPayload> => {
  try {
    const res = await fetch("/posts.json", { cache: "no-store" });
    if (!res.ok) return fallbackPosts;
    const data = (await res.json()) as PostsPayload;
    if (!data.posts || !Array.isArray(data.posts)) return fallbackPosts;
    return data;
  } catch {
    return fallbackPosts;
  }
};

const appendChatMessage = (role: "user" | "ai", text: string) => {
  if (!chatHistory) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
};

const initChat = () => {
  if (!chatFab || !chatPanel) return;
  const closeBtn = chatPanel.querySelector<HTMLButtonElement>("[data-action=\"close-chat\"]");

  const setOpen = (open: boolean) => {
    chatPanel.classList.toggle("active", open);
    chatPanel.setAttribute("aria-hidden", String(!open));
    chatFab.setAttribute("aria-expanded", String(open));
  };

  chatFab.addEventListener("click", () => setOpen(!chatPanel.classList.contains("active")));
  closeBtn?.addEventListener("click", () => setOpen(false));

  appendChatMessage("ai", "Ask for headlines, briefs, or system status.");

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = chatInput?.value.trim();
    if (!value) return;
    appendChatMessage("user", value);
    appendChatMessage("ai", "Prompt chain pending. This is a layout stub.");
    if (chatInput) chatInput.value = "";
  });
};

const initActions = () => {
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const action = el.getAttribute("data-action");
      if (action === "toggle-grid") {
        const grid = document.querySelector<HTMLElement>(".grid-lines");
        if (!grid) return;
        const hidden = grid.style.display === "none";
        grid.style.display = hidden ? "" : "none";
      }
      if (action === "refresh") {
        void bootstrap();
      }
    });
  });
};

const bootstrap = async () => {
  setHeroTerminal();
  setChatTerminal();
  const postsPayload = await loadPosts();
  renderHeadlines(postsPayload.posts);
  renderPosts(postsPayload.posts);
  const rows = await loadSystemRows();
  renderTableRows(rows);
};

const init = () => {
  initChat();
  initActions();
  void bootstrap();
};

init();

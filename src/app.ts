import {
  fetchModelRuntimeStatus,
  loadRuntimeModel,
  refreshRuntimePanel,
  setRuntimeStatusText,
  updateRuntimePanel,
  unloadRuntimeModel,
  trimModelId
} from "./runtime/runtime-panel";
import type { RuntimePanelElements } from "./runtime/types";

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

type EcosystemServicePayload = {
  ok?: boolean;
  base_url?: string;
  model_id?: string | null;
  model_type?: string | null;
  loaded?: boolean;
  embedding_model?: string | null;
  stats?: {
    ok?: boolean;
    data?: Record<string, unknown> | null;
  } | null;
};

type EcosystemStatus = {
  status?: string;
  generated_at?: number | string;
  collection?: string;
  services?: {
    llm?: EcosystemServicePayload | null;
    rag?: EcosystemServicePayload | null;
    audio?: EcosystemServicePayload | null;
    vlm?: EcosystemServicePayload | null;
    mcp?: EcosystemServicePayload | null;
  };
};

type ModelListResponse = {
  data?: { id?: string | null }[];
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
const llmRuntimeLoaded = qs<HTMLElement>("#llmRuntimeLoaded");
const llmRuntimeModel = qs<HTMLElement>("#llmRuntimeModel");
const llmRuntimeType = qs<HTMLElement>("#llmRuntimeType");
const llmRuntimeQueue = qs<HTMLElement>("#llmRuntimeQueue");
const llmRuntimeActive = qs<HTMLElement>("#llmRuntimeActive");
const llmRuntimeConfig = qs<HTMLElement>("#llmRuntimeConfig");
const llmRuntimeStatus = qs<HTMLElement>("#llmRuntimeStatus");
const llmRuntimeModelSelect = qs<HTMLSelectElement>("#llmRuntimeModelSelect");
const llmRuntimeRefresh = qs<HTMLButtonElement>("#llmRuntimeRefresh");
const llmRuntimeUnload = qs<HTMLButtonElement>("#llmRuntimeUnload");
const llmRuntimeLoad = qs<HTMLButtonElement>("#llmRuntimeLoad");
const llmRuntimeForce = qs<HTMLInputElement>("#llmRuntimeForce");

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const formatTimestamp = (value?: string | number | null): string => {
  if (value == null) return "-";
  if (typeof value === "number") {
    const ms = value < 100000000000 ? value * 1000 : value;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
  return formatDate(value);
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

const fetchJson = async (url: string): Promise<{ ok: boolean; data?: any }> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false };
    const data = await res.json().catch(() => null);
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
};

const populateRuntimeModelSelect = (
  select: HTMLSelectElement,
  models: string[],
  activeModel?: string
) => {
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select model";
  select.appendChild(placeholder);

  const modelSet = new Set(models.filter(Boolean));
  if (activeModel) {
    modelSet.add(activeModel);
  }

  Array.from(modelSet)
    .sort()
    .forEach((modelId) => {
      const option = document.createElement("option");
      option.value = modelId;
      option.textContent = trimModelId(modelId);
      option.title = modelId;
      select.appendChild(option);
    });

  if (activeModel && modelSet.has(activeModel)) {
    select.value = activeModel;
  }
};

const loadRuntimeModels = async (llmBaseUrl: string): Promise<string[]> => {
  const response = await fetchJson(`${llmBaseUrl}/v1/models`);
  if (!response.ok || !response.data) return [];
  const payload = response.data as ModelListResponse;
  if (!Array.isArray(payload.data)) return [];
  return payload.data.map((model) => model.id).filter(Boolean) as string[];
};

const getRuntimeElements = (): RuntimePanelElements | null => {
  if (
    !llmRuntimeLoaded ||
    !llmRuntimeModel ||
    !llmRuntimeType ||
    !llmRuntimeQueue ||
    !llmRuntimeActive ||
    !llmRuntimeConfig ||
    !llmRuntimeStatus ||
    !llmRuntimeModelSelect ||
    !llmRuntimeRefresh ||
    !llmRuntimeUnload ||
    !llmRuntimeLoad ||
    !llmRuntimeForce
  ) {
    return null;
  }
  return {
    llmRuntimeLoaded,
    llmRuntimeModel,
    llmRuntimeType,
    llmRuntimeQueue,
    llmRuntimeActive,
    llmRuntimeConfig,
    llmRuntimeStatus,
    llmRuntimeModelSelect,
    llmRuntimeRefresh,
    llmRuntimeUnload,
    llmRuntimeLoad,
    llmRuntimeForce
  };
};

const initRuntimePanel = async () => {
  const els = getRuntimeElements();
  if (!els) return;
  if (!config.llmBaseUrl) {
    setRuntimeStatusText(els, "Missing LLM base URL.");
    return;
  }
  const [models, status] = await Promise.all([
    loadRuntimeModels(config.llmBaseUrl),
    fetchModelRuntimeStatus(config.llmBaseUrl)
  ]);
  updateRuntimePanel(els, status);
  const activeModel = status?.model_id || status?.model_path || "";
  populateRuntimeModelSelect(els.llmRuntimeModelSelect, models, activeModel);

  els.llmRuntimeRefresh.addEventListener("click", () => {
    void refreshRuntimePanel(els, config.llmBaseUrl);
  });
  els.llmRuntimeLoad.addEventListener("click", () => {
    void loadRuntimeModel(els, config.llmBaseUrl);
  });
  els.llmRuntimeUnload.addEventListener("click", () => {
    void unloadRuntimeModel(els, config.llmBaseUrl);
  });
};

const extractRagStats = (
  payload?: { ok?: boolean; data?: Record<string, unknown> | null } | Record<string, unknown> | null
) => {
  if (!payload) return null;
  const payloadRecord = payload as { ok?: boolean; data?: Record<string, unknown> | null };
  const data =
    typeof payloadRecord.ok === "boolean"
      ? payloadRecord.ok
        ? payloadRecord.data
        : null
      : (payload as Record<string, unknown>);
  if (!data) return null;
  const count =
    (data.num_documents as number | undefined) ??
    (data.documents as number | undefined) ??
    (data.count as number | undefined);
  const updated =
    (data.updated_at as string | undefined) ??
    (data.generated_at as string | undefined) ??
    (data.created_at as string | undefined);
  return {
    count: count != null ? String(count) : "-",
    updated: formatTimestamp(updated)
  };
};

const loadSystemRows = async (): Promise<SystemRow[]> => {
  const rows: SystemRow[] = [];
  let ecosystem: EcosystemStatus | null = null;

  if (config.llmBaseUrl) {
    const ecosystemResponse = await fetchJson(
      `${config.llmBaseUrl}/internal/ecosystem/status?collection=anthology`
    );
    if (ecosystemResponse.ok && ecosystemResponse.data) {
      ecosystem = ecosystemResponse.data as EcosystemStatus;
    }
  }

  if (ecosystem?.services) {
    const updated = formatTimestamp(ecosystem.generated_at);
    const addServiceRow = (
      label: string,
      service: EcosystemServicePayload | null | undefined,
      fallbackBase: string,
      docs: string
    ) => {
      rows.push({
        resource: label,
        type: "service",
        status: service ? (service.ok ? "ok" : "down") : "unknown",
        docs,
        updated,
        endpoint: service?.base_url || fallbackBase || "-"
      });
    };

    const llmService = ecosystem.services.llm || null;
    const llmDocs = llmService
      ? llmService.model_id
        ? trimModelId(llmService.model_id)
        : llmService.loaded
        ? "loaded"
        : "unloaded"
      : "-";
    addServiceRow("mlx-llm", llmService, config.llmBaseUrl, llmDocs);

    const ragService = ecosystem.services.rag || null;
    const ragDocs = ragService?.embedding_model
      ? trimModelId(ragService.embedding_model)
      : "-";
    addServiceRow("mlx-rag", ragService, config.ragBaseUrl, ragDocs);

    addServiceRow("mlx-audio", ecosystem.services.audio || null, config.audioBaseUrl, "-");
    if (ecosystem.services.vlm) {
      addServiceRow("mlx-vlm", ecosystem.services.vlm, "-", "-");
    }
    if (ecosystem.services.mcp) {
      addServiceRow("mlx-mcp", ecosystem.services.mcp, "-", "-");
    }
  } else {
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
  }

  const collections = ["anthology", "blog", "projects"];
  for (const collection of collections) {
    let statsPayload: { ok?: boolean; data?: Record<string, unknown> | null } | null = null;
    if (ecosystem?.services?.rag?.stats && ecosystem.collection === collection) {
      statsPayload = ecosystem.services.rag.stats;
    } else {
      const statsResponse = await fetchJson(
        `${config.ragBaseUrl}/rag_stats?collection=${encodeURIComponent(collection)}`
      );
      statsPayload = statsResponse.ok ? { ok: true, data: statsResponse.data } : null;
    }

    const parsedStats = extractRagStats(statsPayload);
    const count = parsedStats?.count ?? "-";
    const updated = parsedStats?.updated ?? "-";
    rows.push({
      resource: `rag:${collection}`,
      type: "collection",
      status: parsedStats ? "ok" : "down",
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
  void initRuntimePanel();
  void bootstrap();
};

init();

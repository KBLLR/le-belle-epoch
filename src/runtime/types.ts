export interface ModelRuntimeStatus {
  status?: string;
  loaded?: boolean;
  model_id?: string | null;
  model_path?: string | null;
  model_type?: string | null;
  queue?: {
    queue_stats?: {
      active_requests?: number;
      queue_size?: number;
    };
    active_streams?: number;
  } | null;
  config?: {
    max_concurrency?: number | null;
    queue_size?: number | null;
    queue_timeout?: number | null;
    mlx_warmup?: boolean | null;
  } | null;
}

export interface RuntimePanelElements {
  llmRuntimeLoaded: HTMLElement;
  llmRuntimeModel: HTMLElement;
  llmRuntimeType: HTMLElement;
  llmRuntimeQueue: HTMLElement;
  llmRuntimeActive: HTMLElement;
  llmRuntimeConfig: HTMLElement;
  llmRuntimeStatus: HTMLElement;
  llmRuntimeModelSelect: HTMLSelectElement;
  llmRuntimeRefresh: HTMLButtonElement;
  llmRuntimeUnload: HTMLButtonElement;
  llmRuntimeLoad: HTMLButtonElement;
  llmRuntimeForce: HTMLInputElement;
}

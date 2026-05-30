import type { AppSettings, EndpointConfig, PromptTemplateConfig, QwenModelConfig } from './types';

export const QWEN_ENDPOINTS: EndpointConfig[] = [
  {
    key: 'intl',
    label: 'Model Studio Singapore',
    apiKeyKind: 'dashscope',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
  },
  {
    key: 'us',
    label: 'Model Studio US',
    apiKeyKind: 'dashscope',
    baseUrl: 'https://dashscope-us.aliyuncs.com/compatible-mode/v1'
  },
  {
    key: 'beijing',
    label: 'Model Studio Beijing',
    apiKeyKind: 'dashscope',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    key: 'hong-kong',
    label: 'Model Studio Hong Kong',
    apiKeyKind: 'dashscope',
    baseUrl: 'https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    key: 'coding-intl',
    label: 'Coding Plan International',
    apiKeyKind: 'coding-plan',
    baseUrl: 'https://coding-intl.dashscope.aliyuncs.com/v1'
  },
  {
    key: 'coding-china',
    label: 'Coding Plan China',
    apiKeyKind: 'coding-plan',
    baseUrl: 'https://coding.dashscope.aliyuncs.com/v1'
  }
];

export const QWEN_MODELS: QwenModelConfig[] = [
  {
    id: 'qwen3.7-max',
    name: 'Qwen3.7 Max',
    description: 'Flagship agent model for long-horizon coding and automation.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'agentic-coding', 'file-input']
  },
  {
    id: 'qwen3-max',
    name: 'Qwen3 Max',
    description: 'Stable Qwen Max family model for complex coding tasks.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'agentic-coding', 'file-input']
  },
  {
    id: 'qwen3-max-preview',
    name: 'Qwen3 Max Preview',
    description: 'Preview Qwen Max model for frontier capabilities.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'agentic-coding', 'file-input', 'preview']
  },
  {
    id: 'qwen3-max-2026-01-23',
    name: 'Qwen3 Max 2026-01-23',
    description: 'Snapshot Qwen Max model with thinking support.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'agentic-coding', 'file-input']
  },
  {
    id: 'qwen3-coder-plus',
    name: 'Qwen3 Coder Plus',
    description: 'Coding Plan model optimized for agentic coding workflows.',
    recommendedEndpoint: 'coding-intl',
    supportsThinking: false,
    capabilities: ['coding-plan', 'agentic-coding', 'file-input']
  },
  {
    id: 'qwen3.5-plus',
    name: 'Qwen3.5 Plus',
    description: 'Fast multimodal-capable Qwen model with strong coding ability.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'vision', 'file-input', 'fast']
  },
  {
    id: 'qwen3.5-flash',
    name: 'Qwen3.5 Flash',
    description: 'Fast, cost-efficient Qwen model for lightweight tasks.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'fast']
  },
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    description: 'Balanced general-purpose Qwen model.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'balanced', 'file-input']
  },
  {
    id: 'qwen-plus-latest',
    name: 'Qwen Plus Latest',
    description: 'Latest Qwen Plus alias for general development.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'balanced', 'file-input', 'latest']
  },
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    description: 'Low-latency Qwen model for quick edits and side tasks.',
    recommendedEndpoint: 'intl',
    supportsThinking: true,
    capabilities: ['thinking', 'fast']
  }
];

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplateConfig[] = [
  {
    id: 'inspect',
    label: 'Inspect',
    prompt: 'Inspect this workspace and summarize the current architecture, key files, scripts, and risks. Do not edit files yet.'
  },
  {
    id: 'fix-checks',
    label: 'Fix checks',
    prompt: 'Run the available checks, identify failures, fix them, and rerun the relevant checks.'
  },
  {
    id: 'ui-pass',
    label: 'UI pass',
    prompt: 'Improve the UI polish, spacing, responsive behavior, and accessibility while keeping the existing visual language.'
  },
  {
    id: 'review',
    label: 'Review',
    prompt: 'Review the current git changes for bugs, regressions, and missing tests. Do not edit files unless asked.'
  },
  {
    id: 'game',
    label: 'Game',
    prompt: 'Build a polished browser-playable game in this workspace. Keep it self-contained unless the project already has a stack.'
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  modelId: 'qwen3.7-max',
  endpointKey: 'intl',
  permissionMode: 'auto-edit',
  thinkingEnabled: true,
  thinkingBudget: 8192,
  usageLimitTokens: 100000,
  previewPort: 6173,
  previewCommand: '',
  qwenExecutablePath: '',
  onboardingCompleted: false,
  promptTemplates: DEFAULT_PROMPT_TEMPLATES
};

export function getEndpoint(key: string): EndpointConfig {
  return QWEN_ENDPOINTS.find((endpoint) => endpoint.key === key) ?? QWEN_ENDPOINTS[0];
}

export function getModel(id: string): QwenModelConfig {
  return QWEN_MODELS.find((model) => model.id === id) ?? QWEN_MODELS[0];
}

export function isAllowedQwenModel(modelId: string): boolean {
  return QWEN_MODELS.some((model) => model.id === modelId);
}

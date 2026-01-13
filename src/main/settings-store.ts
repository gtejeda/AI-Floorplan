/**
 * Application Settings Store
 * Uses electron-store for persistent settings
 */

import Store from 'electron-store';

interface AppSettings {
  defaultCurrency: 'DOP' | 'USD';
  defaultUnit: 'sqm' | 'sqft';
  exchangeRate: number;
  recentProjects: string[];
  telemetry?: {
    enabled: boolean;
    enabledAt?: string;
    disabledAt?: string;
    hasLaunched?: boolean;
    events?: any[];
    crashes?: any[];
  };
}

const schema = {
  defaultCurrency: {
    type: 'string',
    enum: ['DOP', 'USD'],
    default: 'USD',
  },
  defaultUnit: {
    type: 'string',
    enum: ['sqm', 'sqft'],
    default: 'sqm',
  },
  exchangeRate: {
    type: 'number',
    minimum: 0,
    default: 58.5,
  },
  recentProjects: {
    type: 'array',
    items: {
      type: 'string',
    },
    default: [],
  },
  telemetry: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        default: false,
      },
      enabledAt: {
        type: 'string',
      },
      disabledAt: {
        type: 'string',
      },
      hasLaunched: {
        type: 'boolean',
        default: false,
      },
      events: {
        type: 'array',
        default: [],
      },
      crashes: {
        type: 'array',
        default: [],
      },
    },
    default: {
      enabled: false,
      hasLaunched: false,
      events: [],
      crashes: [],
    },
  },
};

const store = new Store<AppSettings>({ schema: schema as any });

/**
 * Add a project to recent projects list
 * Keeps the list to a maximum of 5 projects
 * @param projectPath Absolute path to the project directory
 */
export function addRecentProject(projectPath: string): void {
  const recent = store.get('recentProjects', []);

  // Remove if already exists
  const filtered = recent.filter((p) => p !== projectPath);

  // Add to beginning
  filtered.unshift(projectPath);

  // Keep only last 5
  const limited = filtered.slice(0, 5);

  store.set('recentProjects', limited);
}

/**
 * Get the list of recent projects
 * @returns Array of recent project paths (up to 5)
 */
export function getRecentProjects(): string[] {
  return store.get('recentProjects', []);
}

/**
 * Clear all recent projects
 */
export function clearRecentProjects(): void {
  store.set('recentProjects', []);
}

/**
 * Remove a specific project from recent projects
 * @param projectPath Path to remove
 */
export function removeRecentProject(projectPath: string): void {
  const recent = store.get('recentProjects', []);
  const filtered = recent.filter((p) => p !== projectPath);
  store.set('recentProjects', filtered);
}

export default store;

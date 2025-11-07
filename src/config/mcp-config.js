/**
 * MCP Configuration for Frontend Auditor Agent
 * Handles chunked data fetching to avoid context window limits
 */

export const MCP_CONFIG = {
  // Repository configurations
  repositories: {
    target: {
      owner: 'DTSL',
      repo: 'dnd-editor',
      branch: 'dev'
    },
    boilerplate: {
      owner: 'DTSL',
      repo: 'backstage-templates',
      path: 'templates/monorepo-app-boilerplate/template',
      branch: 'main'
    },
    commonConfig: {
      owner: 'DTSL',
      repo: 'fe-common-config',
      branch: 'main'
    }
  },

  // Chunking configuration to avoid context window limits
  chunking: {
    maxFileSize: 50000, // 50KB per file
    maxFilesPerBatch: 10, // Process 10 files at a time
    excludePatterns: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '*.log',
      '*.lock',
      'yarn.lock',
      'package-lock.json'
    ],
    includePatterns: [
      'package.json',
      'tsconfig.json',
      'babel.config.*',
      'jest.config.*',
      'webpack.config.*',
      'eslint.config.*',
      '*.md',
      'src/**/*.{js,jsx,ts,tsx}',
      'apps/**/package.json',
      'packages/**/package.json',
      'config/**/*.{js,json}'
    ]
  },

  // Audit rule priorities
  auditRules: {
    critical: [
      'package-structure',
      'dependency-versions',
      'security-vulnerabilities'
    ],
    high: [
      'code-quality',
      'test-coverage',
      'build-configuration'
    ],
    medium: [
      'documentation',
      'naming-conventions',
      'file-organization'
    ],
    low: [
      'comments',
      'formatting',
      'unused-dependencies'
    ]
  },

  // Rate limiting to respect GitHub API limits
  rateLimiting: {
    requestsPerMinute: 60,
    batchDelay: 1000, // 1 second between batches
    retryAttempts: 3,
    retryDelay: 2000 // 2 seconds
  }
};

export const AUDIT_CATEGORIES = {
  STRUCTURE: 'Repository Structure',
  DEPENDENCIES: 'Dependencies & Package Management',
  BUILD: 'Build Configuration',
  CODE_QUALITY: 'Code Quality & Standards',
  TESTING: 'Testing Setup',
  DOCUMENTATION: 'Documentation',
  SECURITY: 'Security & Compliance'
};

export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};
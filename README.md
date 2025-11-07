# Frontend Auditor Agent

🤖 AI-powered frontend auditor agent for DTSL monorepo standards compliance

## Overview

The Frontend Auditor Agent is designed to audit frontend repositories against DTSL (Sendinblue) standards by comparing them with:

1. **Target Monorepo**: The repository you want to audit (e.g., `dnd-editor`)
2. **Boilerplate Template**: Reference implementation from `DTSL/backstage-templates`
3. **Common Config**: Shared configuration standards from `DTSL/fe-common-config`

### Key Features

- 🔍 **Chunked Data Processing**: Handles large repositories without hitting context window limits
- 📊 **Comprehensive Auditing**: Checks structure, dependencies, build config, code quality, testing, and documentation
- 📈 **Compliance Scoring**: Provides actionable compliance scores for each category
- 📝 **Multiple Report Formats**: JSON, Markdown, HTML, and executive summaries
- ⚡ **CLI Interface**: Easy-to-use command-line interface
- 🔧 **Extensible Rules**: Configurable audit rules and severity levels

## Installation

### Prerequisites

- Node.js 18+ 
- GitHub Personal Access Token with repository access

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sahilsharma2408/frontend-auditor-agent.git
   cd frontend-auditor-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   export GITHUB_TOKEN="your_github_personal_access_token"
   ```

4. **Make CLI executable:**
   ```bash
   npm link
   # or
   chmod +x src/cli.js
   ```

## Usage

### Command Line Interface

#### Basic Audit
```bash
frontend-auditor audit --owner DTSL --repo dnd-editor
```

#### Generate Markdown Report
```bash
frontend-auditor audit --owner DTSL --repo dnd-editor --format markdown --output audit-report.md
```

#### Filter by Severity
```bash
frontend-auditor audit --owner DTSL --repo dnd-editor --severity high
```

#### Generate Executive Summary
```bash
frontend-auditor audit --owner DTSL --repo dnd-editor --format executive
```

#### All Options
```bash
frontend-auditor audit \
  --owner DTSL \
  --repo dnd-editor \
  --token your_token \
  --format markdown \
  --output report.md \
  --severity medium
```

### Programmatic Usage

```javascript
import FrontendAuditorAgent from './src/index.js';

const agent = new FrontendAuditorAgent(process.env.GITHUB_TOKEN);

// Run audit
const auditReport = await agent.auditRepository('DTSL', 'dnd-editor');

// Generate different formats
const markdownReport = agent.generateReport(auditReport, 'markdown');
const jsonReport = agent.generateReport(auditReport, 'json');
const executiveSummary = agent.generateReport(auditReport, 'executive');

// Save to file
await agent.saveReport(markdownReport, 'audit-report.md');
```

## Solving Context Window Issues

The main challenge you mentioned was **"Your input exceeds the context window"**. This agent solves this through several strategies:

### 🔧 Chunked Data Processing

Instead of loading entire repositories at once, the agent:

1. **Fetches files in small batches** (max 10 files at a time)
2. **Limits file sizes** (max 50KB per file)  
3. **Excludes large/irrelevant files** (`node_modules`, `dist`, `coverage`, etc.)
4. **Focuses on key files** (`package.json`, config files, etc.)

### 📊 Smart Filtering

```javascript
// Only processes relevant files
includePatterns: [
  'package.json',
  'tsconfig.json', 
  'babel.config.*',
  'jest.config.*',
  'src/**/*.{js,jsx,ts,tsx}' // Limited to source files only
]
```

### ⚡ Rate-Limited Processing

- Adds delays between API calls
- Respects GitHub API limits
- Implements retry logic with backoff

## Audit Categories

The agent checks compliance across several categories:

### 🏗️ Repository Structure
- Root `package.json` with workspaces configuration
- Proper monorepo directory structure (`apps/`, `packages/`, `config/`)
- Package manager and engines specification

### 📦 Dependencies & Package Management  
- DTSL common dependencies (`@dtsl/jest-config`, `@dtsl/eslint-config`, etc.)
- Dependency version consistency
- Security vulnerability detection

### ⚙️ Build Configuration
- Turborepo configuration (`turbo.json`)
- TypeScript setup (`tsconfig.json`)
- Babel configuration (`babel.config.json`)

### ✨ Code Quality & Standards
- ESLint configuration
- Prettier setup
- Husky and lint-staged for pre-commit hooks

### 🧪 Testing Setup
- Jest configuration
- Test scripts in `package.json`
- CI/CD test integration

## Quick Start Example

```bash
# 1. Clone and setup
git clone https://github.com/sahilsharma2408/frontend-auditor-agent.git
cd frontend-auditor-agent
npm install

# 2. Set your GitHub token
export GITHUB_TOKEN="ghp_your_token_here"

# 3. Run audit on dnd-editor
npm start -- audit --owner DTSL --repo dnd-editor

# 4. Generate detailed report
npm start -- audit --owner DTSL --repo dnd-editor --format markdown --output dnd-editor-audit.md
```

## API Reference

### FrontendAuditorAgent

```javascript
const agent = new FrontendAuditorAgent(githubToken);

// Main methods
await agent.auditRepository(owner, repo, options)
agent.generateReport(auditReport, format)
await agent.saveReport(content, filePath)
await agent.getRepositoryMetadata(owner, repo)
```

## Troubleshooting Context Window Issues

If you still encounter context window issues:

1. **Reduce batch size**:
   ```javascript
   // In src/config/mcp-config.js
   chunking: {
     maxFileSize: 25000,     // Reduce from 50KB to 25KB
     maxFilesPerBatch: 5,    // Reduce from 10 to 5
   }
   ```

2. **Add more exclusions**:
   ```javascript
   excludePatterns: [
     'node_modules/**',
     'coverage/**',
     'dist/**',
     'build/**',
     '*.lock',
     '*.log',
     'docs/**',        // Add docs exclusion
     'examples/**'     // Add examples exclusion  
   ]
   ```

3. **Focus on specific categories**:
   ```bash
   # Only check critical issues
   frontend-auditor audit --owner DTSL --repo dnd-editor --severity critical
   ```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-audit-rule`
3. Make your changes and add tests
4. Submit a pull request

## License

MIT License

---

**🎯 Ready to audit your repositories without context window limits!** 

For questions or issues, please create a GitHub issue.
/**
 * Frontend Auditor Agent - Main Entry Point
 * AI-powered frontend auditor for DTSL monorepo standards compliance
 */

import { GitHubMCPClient } from './services/github-mcp-client.js';
import { AuditEngine } from './audit/audit-engine.js';
import { ReportGenerator } from './reports/report-generator.js';

export class FrontendAuditorAgent {
  constructor(githubToken) {
    this.githubClient = new GitHubMCPClient(githubToken);
    this.auditEngine = new AuditEngine(this.githubClient);
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Audit a repository against DTSL standards
   */
  async auditRepository(owner, repo, options = {}) {
    try {
      console.log(`Starting audit for ${owner}/${repo}...`);
      
      const auditReport = await this.auditEngine.auditRepository(owner, repo);
      
      if (options.format) {
        return this.generateReport(auditReport, options.format);
      }
      
      return auditReport;
    } catch (error) {
      console.error('Audit failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate report in specified format
   */
  generateReport(auditReport, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return this.reportGenerator.generateJSON(auditReport);
      case 'markdown':
      case 'md':
        return this.reportGenerator.generateMarkdown(auditReport);
      case 'html':
        return this.reportGenerator.generateHTML(auditReport);
      case 'executive':
        return this.reportGenerator.generateExecutiveSummary(auditReport);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Save report to file
   */
  async saveReport(content, filePath) {
    return this.reportGenerator.saveReport(content, filePath);
  }

  /**
   * Get repository metadata
   */
  async getRepositoryMetadata(owner, repo) {
    return this.githubClient.getRepositoryDataChunked(owner, repo);
  }

  /**
   * Compare two repositories
   */
  async compareRepositories(repo1, repo2) {
    const [data1, data2] = await Promise.all([
      this.githubClient.getRepositoryDataChunked(repo1.owner, repo1.repo),
      this.githubClient.getRepositoryDataChunked(repo2.owner, repo2.repo)
    ]);

    return {
      repository1: data1,
      repository2: data2,
      comparison: {
        // This could be expanded to include detailed comparisons
        packageFileCount: {
          repo1: data1.packageFiles.length,
          repo2: data2.packageFiles.length
        },
        configFileCount: {
          repo1: data1.configFiles.length,
          repo2: data2.configFiles.length
        }
      }
    };
  }
}

// Export individual components for advanced usage
export { GitHubMCPClient } from './services/github-mcp-client.js';
export { AuditEngine } from './audit/audit-engine.js';
export { ReportGenerator } from './reports/report-generator.js';
export { MCP_CONFIG, AUDIT_CATEGORIES, SEVERITY_LEVELS } from './config/mcp-config.js';

// Default export
export default FrontendAuditorAgent;
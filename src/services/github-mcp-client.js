/**
 * GitHub MCP Client for Frontend Auditor Agent
 * Handles chunked data fetching to avoid context window limits
 */

import { Octokit } from '@octokit/rest';
import { MCP_CONFIG } from '../config/mcp-config.js';

export class GitHubMCPClient {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
    this.config = MCP_CONFIG;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Get repository structure with chunked processing
   */
  async getRepositoryStructure(owner, repo, path = '') {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: this.config.repositories.target.branch
      });

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error(`Error fetching repository structure: ${error.message}`);
      return [];
    }
  }

  /**
   * Get file content with size validation
   */
  async getFileContent(owner, repo, path) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: this.config.repositories.target.branch
      });

      if (data.size > this.config.chunking.maxFileSize) {
        console.warn(`File ${path} exceeds max size (${data.size} bytes), skipping...`);
        return null;
      }

      return {
        path: data.path,
        content: Buffer.from(data.content, 'base64').toString('utf8'),
        size: data.size,
        sha: data.sha
      };
    } catch (error) {
      console.error(`Error fetching file content for ${path}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get package.json files from all workspace packages
   */
  async getPackageJsonFiles(owner, repo) {
    const packageFiles = [];
    
    try {
      // Get root package.json
      const rootPackage = await this.getFileContent(owner, repo, 'package.json');
      if (rootPackage) {
        packageFiles.push(rootPackage);
      }

      // Get package.json from apps/ and packages/ directories
      const appsStructure = await this.getRepositoryStructure(owner, repo, 'apps');
      const packagesStructure = await this.getRepositoryStructure(owner, repo, 'packages');

      // Process apps directory
      for (const item of appsStructure) {
        if (item.type === 'dir') {
          const appPackage = await this.getFileContent(owner, repo, `${item.path}/package.json`);
          if (appPackage) {
            packageFiles.push(appPackage);
          }
        }
      }

      // Process packages directory
      for (const item of packagesStructure) {
        if (item.type === 'dir') {
          const packageJson = await this.getFileContent(owner, repo, `${item.path}/package.json`);
          if (packageJson) {
            packageFiles.push(packageJson);
          }
        }
      }

      return packageFiles;
    } catch (error) {
      console.error('Error fetching package.json files:', error.message);
      return packageFiles;
    }
  }

  /**
   * Get configuration files (babel, jest, webpack, etc.)
   */
  async getConfigFiles(owner, repo) {
    const configFiles = [];
    const configPatterns = [
      'babel.config.*',
      'jest.config.*',
      'webpack.config.*',
      'tsconfig.json',
      'jsconfig.json',
      'eslint.config.*',
      'prettier.config.*',
      'turbo.json'
    ];

    try {
      const rootStructure = await this.getRepositoryStructure(owner, repo);
      
      for (const item of rootStructure) {
        if (item.type === 'file' && this.matchesPattern(item.name, configPatterns)) {
          const fileContent = await this.getFileContent(owner, repo, item.path);
          if (fileContent) {
            configFiles.push(fileContent);
          }
        }
      }

      // Also check config/ directory if it exists
      const configDir = await this.getRepositoryStructure(owner, repo, 'config');
      for (const item of configDir) {
        if (item.type === 'file') {
          const fileContent = await this.getFileContent(owner, repo, item.path);
          if (fileContent) {
            configFiles.push(fileContent);
          }
        }
      }

      return configFiles;
    } catch (error) {
      console.error('Error fetching config files:', error.message);
      return configFiles;
    }
  }

  /**
   * Get boilerplate template structure for comparison
   */
  async getBoilerplateTemplate() {
    const { owner, repo, path } = this.config.repositories.boilerplate;
    
    try {
      const templateStructure = await this.getRepositoryStructure(owner, repo, path);
      const templateFiles = [];

      // Get key template files
      const keyFiles = [
        'package.json',
        'babel.config.json',
        'jest.config.js',
        'tsconfig.json',
        'turbo.json'
      ];

      for (const fileName of keyFiles) {
        const filePath = path ? `${path}/${fileName}` : fileName;
        const fileContent = await this.getFileContent(owner, repo, filePath);
        if (fileContent) {
          templateFiles.push(fileContent);
        }
      }

      return templateFiles;
    } catch (error) {
      console.error('Error fetching boilerplate template:', error.message);
      return [];
    }
  }

  /**
   * Get common config repository structure
   */
  async getCommonConfig() {
    const { owner, repo } = this.config.repositories.commonConfig;
    
    try {
      const configStructure = await this.getRepositoryStructure(owner, repo);
      const configFiles = [];

      for (const item of configStructure) {
        if (item.type === 'file' && item.name.endsWith('.json') || item.name.endsWith('.js')) {
          const fileContent = await this.getFileContent(owner, repo, item.path);
          if (fileContent) {
            configFiles.push(fileContent);
          }
        }
      }

      return configFiles;
    } catch (error) {
      console.error('Error fetching common config:', error.message);
      return [];
    }
  }

  /**
   * Rate limiting helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if filename matches any pattern
   */
  matchesPattern(filename, patterns) {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filename);
    });
  }

  /**
   * Get chunked repository data to avoid context window limits
   */
  async getRepositoryDataChunked(owner, repo) {
    console.log(`Fetching chunked data for ${owner}/${repo}...`);
    
    const repositoryData = {
      packageFiles: [],
      configFiles: [],
      metadata: {
        owner,
        repo,
        fetchedAt: new Date().toISOString(),
        totalFiles: 0
      }
    };

    try {
      // Get package.json files
      console.log('Fetching package.json files...');
      repositoryData.packageFiles = await this.getPackageJsonFiles(owner, repo);
      await this.delay(this.config.rateLimiting.batchDelay);

      // Get configuration files
      console.log('Fetching configuration files...');
      repositoryData.configFiles = await this.getConfigFiles(owner, repo);
      await this.delay(this.config.rateLimiting.batchDelay);

      repositoryData.metadata.totalFiles = 
        repositoryData.packageFiles.length + repositoryData.configFiles.length;

      console.log(`Fetched ${repositoryData.metadata.totalFiles} files successfully`);
      return repositoryData;

    } catch (error) {
      console.error('Error in chunked data fetching:', error.message);
      throw error;
    }
  }
}
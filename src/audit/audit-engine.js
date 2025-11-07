/**
 * Audit Engine for Frontend Auditor Agent
 * Compares target repository against boilerplate and common config standards
 */

import { AUDIT_CATEGORIES, SEVERITY_LEVELS } from '../config/mcp-config.js';

export class AuditEngine {
  constructor(githubClient) {
    this.githubClient = githubClient;
    this.auditResults = [];
  }

  /**
   * Main audit function
   */
  async auditRepository(owner, repo) {
    console.log(`Starting audit for ${owner}/${repo}...`);
    
    const auditReport = {
      repository: { owner, repo },
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        complianceScore: 0
      },
      categories: {},
      recommendations: []
    };

    try {
      // Fetch target repository data
      const targetData = await this.githubClient.getRepositoryDataChunked(owner, repo);
      
      // Fetch boilerplate template for comparison
      const boilerplateData = await this.githubClient.getBoilerplateTemplate();
      
      // Fetch common config standards
      const commonConfigData = await this.githubClient.getCommonConfig();

      // Run audit checks
      await this.auditPackageStructure(targetData, boilerplateData, auditReport);
      await this.auditDependencyManagement(targetData, boilerplateData, auditReport);
      await this.auditBuildConfiguration(targetData, boilerplateData, auditReport);
      await this.auditCodeQualitySetup(targetData, commonConfigData, auditReport);
      await this.auditTestingSetup(targetData, boilerplateData, auditReport);
      await this.auditDocumentation(targetData, auditReport);

      // Calculate compliance score
      this.calculateComplianceScore(auditReport);

      console.log(`Audit completed. Found ${auditReport.summary.totalIssues} issues.`);
      return auditReport;

    } catch (error) {
      console.error('Error during audit:', error.message);
      throw error;
    }
  }

  /**
   * Audit package structure compliance
   */
  async auditPackageStructure(targetData, boilerplateData, auditReport) {
    const category = AUDIT_CATEGORIES.STRUCTURE;
    auditReport.categories[category] = { issues: [], score: 100 };

    try {
      const rootPackage = targetData.packageFiles.find(f => f.path === 'package.json');
      const boilerplatePackage = boilerplateData.find(f => f.path.includes('package.json'));

      if (!rootPackage) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.CRITICAL,
          message: 'Missing root package.json file',
          description: 'Every monorepo should have a root package.json file',
          file: 'package.json'
        });
        return;
      }

      const rootPkg = JSON.parse(rootPackage.content);
      const boilerplatePkg = boilerplatePackage ? JSON.parse(boilerplatePackage.content) : {};

      // Check workspaces configuration
      if (!rootPkg.workspaces) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.HIGH,
          message: 'Missing workspaces configuration',
          description: 'Monorepo should define workspaces in package.json',
          file: 'package.json',
          suggestion: 'Add workspaces configuration similar to boilerplate'
        });
      }

      // Check package manager configuration
      if (!rootPkg.packageManager) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Missing packageManager field',
          description: 'Should specify package manager version for consistency',
          file: 'package.json'
        });
      }

      // Check engines configuration
      if (!rootPkg.engines) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Missing engines configuration',
          description: 'Should specify Node.js and npm/yarn version requirements',
          file: 'package.json'
        });
      }

      // Check for required directories
      const expectedDirs = ['apps', 'packages', 'config'];
      const hasApps = targetData.packageFiles.some(f => f.path.startsWith('apps/'));
      const hasPackages = targetData.packageFiles.some(f => f.path.startsWith('packages/'));

      if (!hasApps && !hasPackages) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.HIGH,
          message: 'Missing standard monorepo structure',
          description: 'Should have apps/ or packages/ directories',
          file: 'root'
        });
      }

    } catch (error) {
      console.error('Error in package structure audit:', error.message);
    }
  }

  /**
   * Audit dependency management
   */
  async auditDependencyManagement(targetData, boilerplateData, auditReport) {
    const category = AUDIT_CATEGORIES.DEPENDENCIES;
    auditReport.categories[category] = { issues: [], score: 100 };

    try {
      const rootPackage = targetData.packageFiles.find(f => f.path === 'package.json');
      if (!rootPackage) return;

      const rootPkg = JSON.parse(rootPackage.content);

      // Check for common DTSL dependencies
      const requiredDeps = [
        '@dtsl/jest-config',
        '@dtsl/eslint-config',
        '@dtsl/prettier-config',
        '@dtsl/typescript-config'
      ];

      const missingDeps = requiredDeps.filter(dep => 
        !rootPkg.devDependencies?.[dep] && !rootPkg.dependencies?.[dep]
      );

      missingDeps.forEach(dep => {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.MEDIUM,
          message: `Missing DTSL common dependency: ${dep}`,
          description: 'Should use DTSL common configurations for consistency',
          file: 'package.json'
        });
      });

      // Check for outdated dependency patterns
      if (rootPkg.dependencies?.lodash || rootPkg.devDependencies?.lodash) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.LOW,
          message: 'Consider using lodash-es instead of lodash',
          description: 'lodash-es provides better tree-shaking support',
          file: 'package.json'
        });
      }

    } catch (error) {
      console.error('Error in dependency management audit:', error.message);
    }
  }

  /**
   * Audit build configuration
   */
  async auditBuildConfiguration(targetData, boilerplateData, auditReport) {
    const category = AUDIT_CATEGORIES.BUILD;
    auditReport.categories[category] = { issues: [], score: 100 };

    try {
      // Check for Turbo configuration
      const turboConfig = targetData.configFiles.find(f => f.path === 'turbo.json');
      if (!turboConfig) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.HIGH,
          message: 'Missing turbo.json configuration',
          description: 'Monorepo should use Turborepo for build orchestration',
          file: 'turbo.json'
        });
      }

      // Check for TypeScript configuration
      const tsConfig = targetData.configFiles.find(f => f.path === 'tsconfig.json');
      if (!tsConfig) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Missing TypeScript configuration',
          description: 'Should have TypeScript configuration for better development experience',
          file: 'tsconfig.json'
        });
      }

      // Check for Babel configuration
      const babelConfig = targetData.configFiles.find(f => 
        f.path.includes('babel.config')
      );
      if (!babelConfig) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Missing Babel configuration',
          description: 'Should have Babel configuration for consistent transpilation',
          file: 'babel.config.json'
        });
      }

    } catch (error) {
      console.error('Error in build configuration audit:', error.message);
    }
  }

  /**
   * Audit code quality setup
   */
  async auditCodeQualitySetup(targetData, commonConfigData, auditReport) {
    const category = AUDIT_CATEGORIES.CODE_QUALITY;
    auditReport.categories[category] = { issues: [], score: 100 };

    try {
      // Check for ESLint configuration
      const eslintConfig = targetData.configFiles.find(f => 
        f.path.includes('eslint.config') || f.path.includes('.eslintrc')
      );
      if (!eslintConfig) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.HIGH,
          message: 'Missing ESLint configuration',
          description: 'Should have ESLint configuration for code quality',
          file: 'eslint.config.js'
        });
      }

      // Check for Prettier configuration
      const prettierConfig = targetData.configFiles.find(f => 
        f.path.includes('prettier.config') || f.path.includes('.prettierrc')
      );
      if (!prettierConfig) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.MEDIUM,
          message: 'Missing Prettier configuration',
          description: 'Should have Prettier configuration for consistent formatting',
          file: 'prettier.config.js'
        });
      }

      // Check package.json for husky/lint-staged
      const rootPackage = targetData.packageFiles.find(f => f.path === 'package.json');
      if (rootPackage) {
        const rootPkg = JSON.parse(rootPackage.content);
        
        if (!rootPkg.devDependencies?.husky) {
          this.addIssue(auditReport, category, {
            severity: SEVERITY_LEVELS.MEDIUM,
            message: 'Missing Husky for git hooks',
            description: 'Should use Husky for pre-commit quality checks',
            file: 'package.json'
          });
        }

        if (!rootPkg.devDependencies?.['lint-staged']) {
          this.addIssue(auditReport, category, {
            severity: SEVERITY_LEVELS.MEDIUM,
            message: 'Missing lint-staged',
            description: 'Should use lint-staged for efficient pre-commit linting',
            file: 'package.json'
          });
        }
      }

    } catch (error) {
      console.error('Error in code quality audit:', error.message);
    }
  }

  /**
   * Audit testing setup
   */
  async auditTestingSetup(targetData, boilerplateData, auditReport) {
    const category = AUDIT_CATEGORIES.TESTING;
    auditReport.categories[category] = { issues: [], score: 100 };

    try {
      // Check for Jest configuration
      const jestConfig = targetData.configFiles.find(f => 
        f.path.includes('jest.config')
      );
      if (!jestConfig) {
        this.addIssue(auditReport, category, {
          severity: SEVERITY_LEVELS.HIGH,
          message: 'Missing Jest configuration',
          description: 'Should have Jest configuration for testing',
          file: 'jest.config.js'
        });
      }

      // Check for test scripts in package.json
      const rootPackage = targetData.packageFiles.find(f => f.path === 'package.json');
      if (rootPackage) {
        const rootPkg = JSON.parse(rootPackage.content);
        
        if (!rootPkg.scripts?.test) {
          this.addIssue(auditReport, category, {
            severity: SEVERITY_LEVELS.MEDIUM,
            message: 'Missing test script',
            description: 'Should have test script in package.json',
            file: 'package.json'
          });
        }

        if (!rootPkg.scripts?.['test:ci']) {
          this.addIssue(auditReport, category, {
            severity: SEVERITY_LEVELS.LOW,
            message: 'Missing CI test script',
            description: 'Should have test:ci script for CI/CD pipelines',
            file: 'package.json'
          });
        }
      }

    } catch (error) {
      console.error('Error in testing setup audit:', error.message);
    }
  }

  /**
   * Audit documentation
   */
  async auditDocumentation(targetData, auditReport) {
    const category = AUDIT_CATEGORIES.DOCUMENTATION;
    auditReport.categories[category] = { issues: [], score: 100 };

    try {
      // This would need to be expanded to check for README files
      // For now, we'll add a placeholder check
      this.addIssue(auditReport, category, {
        severity: SEVERITY_LEVELS.LOW,
        message: 'Documentation audit not fully implemented',
        description: 'README and documentation checks need to be implemented',
        file: 'various'
      });

    } catch (error) {
      console.error('Error in documentation audit:', error.message);
    }
  }

  /**
   * Add issue to audit report
   */
  addIssue(auditReport, category, issue) {
    auditReport.categories[category].issues.push(issue);
    auditReport.summary.totalIssues++;

    switch (issue.severity) {
      case SEVERITY_LEVELS.CRITICAL:
        auditReport.summary.criticalIssues++;
        auditReport.categories[category].score -= 25;
        break;
      case SEVERITY_LEVELS.HIGH:
        auditReport.summary.highIssues++;
        auditReport.categories[category].score -= 15;
        break;
      case SEVERITY_LEVELS.MEDIUM:
        auditReport.summary.mediumIssues++;
        auditReport.categories[category].score -= 10;
        break;
      case SEVERITY_LEVELS.LOW:
        auditReport.summary.lowIssues++;
        auditReport.categories[category].score -= 5;
        break;
    }

    // Ensure score doesn't go below 0
    auditReport.categories[category].score = Math.max(0, auditReport.categories[category].score);
  }

  /**
   * Calculate overall compliance score
   */
  calculateComplianceScore(auditReport) {
    const categoryScores = Object.values(auditReport.categories).map(cat => cat.score);
    const averageScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
    auditReport.summary.complianceScore = Math.round(averageScore);
  }
}
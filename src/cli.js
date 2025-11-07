#!/usr/bin/env node

/**
 * CLI Interface for Frontend Auditor Agent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { GitHubMCPClient } from './services/github-mcp-client.js';
import { AuditEngine } from './audit/audit-engine.js';
import { ReportGenerator } from './reports/report-generator.js';

const program = new Command();

program
  .name('frontend-auditor')
  .description('AI-powered frontend auditor agent for DTSL monorepo standards compliance')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit a repository against DTSL standards')
  .requiredOption('-o, --owner <owner>', 'Repository owner')
  .requiredOption('-r, --repo <repo>', 'Repository name')
  .option('-t, --token <token>', 'GitHub access token (can also use GITHUB_TOKEN env var)')
  .option('--format <format>', 'Output format (json|table|markdown)', 'table')
  .option('--output <file>', 'Output file path')
  .option('--severity <level>', 'Minimum severity level (critical|high|medium|low)', 'low')
  .action(async (options) => {
    const spinner = ora('Initializing audit...').start();
    
    try {
      // Get GitHub token
      const token = options.token || process.env.GITHUB_TOKEN;
      if (!token) {
        spinner.fail('GitHub token is required. Use --token option or set GITHUB_TOKEN environment variable.');
        process.exit(1);
      }

      // Initialize services
      spinner.text = 'Connecting to GitHub...';
      const githubClient = new GitHubMCPClient(token);
      const auditEngine = new AuditEngine(githubClient);
      const reportGenerator = new ReportGenerator();

      // Run audit
      spinner.text = `Auditing ${options.owner}/${options.repo}...`;
      const auditReport = await auditEngine.auditRepository(options.owner, options.repo);

      spinner.succeed(`Audit completed! Found ${auditReport.summary.totalIssues} issues.`);

      // Generate and display report
      if (options.format === 'json') {
        const jsonReport = reportGenerator.generateJSON(auditReport);
        if (options.output) {
          await reportGenerator.saveReport(jsonReport, options.output);
          console.log(`Report saved to ${options.output}`);
        } else {
          console.log(jsonReport);
        }
      } else if (options.format === 'markdown') {
        const markdownReport = reportGenerator.generateMarkdown(auditReport);
        if (options.output) {
          await reportGenerator.saveReport(markdownReport, options.output);
          console.log(`Report saved to ${options.output}`);
        } else {
          console.log(markdownReport);
        }
      } else {
        // Table format (default)
        displayTableReport(auditReport, options.severity);
      }

    } catch (error) {
      spinner.fail(`Audit failed: ${error.message}`);
      console.error(chalk.red('Error details:'), error.message);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Setup MCP configuration for GitHub repositories')
  .action(() => {
    console.log(chalk.blue('Setting up Frontend Auditor Agent...\n'));
    
    console.log(chalk.yellow('Required Environment Variables:'));
    console.log('- GITHUB_TOKEN: Your GitHub personal access token\n');
    
    console.log(chalk.yellow('Usage Examples:'));
    console.log('# Audit a repository');
    console.log('frontend-auditor audit --owner DTSL --repo dnd-editor\n');
    
    console.log('# Generate markdown report');
    console.log('frontend-auditor audit --owner DTSL --repo dnd-editor --format markdown --output audit-report.md\n');
    
    console.log('# Filter by severity');
    console.log('frontend-auditor audit --owner DTSL --repo dnd-editor --severity high\n');
    
    console.log(chalk.green('Setup complete! You can now run audits.'));
  });

function displayTableReport(auditReport, minSeverity) {
  const { repository, summary, categories } = auditReport;
  
  // Display summary
  console.log(chalk.blue.bold(`\nAudit Report for ${repository.owner}/${repository.repo}\n`));
  
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Issues', summary.totalIssues.toString()],
    ['Critical Issues', chalk.red(summary.criticalIssues.toString())],
    ['High Issues', chalk.yellow(summary.highIssues.toString())],
    ['Medium Issues', chalk.blue(summary.mediumIssues.toString())],
    ['Low Issues', chalk.gray(summary.lowIssues.toString())],
    ['Compliance Score', getScoreColor(summary.complianceScore) + '%']
  ];

  console.log(table(summaryData, {
    border: {
      topBody: `─`,
      topJoin: `┬`,
      topLeft: `┌`,
      topRight: `┐`,
      bottomBody: `─`,
      bottomJoin: `┴`,
      bottomLeft: `└`,
      bottomRight: `┘`,
      bodyLeft: `│`,
      bodyRight: `│`,
      bodyJoin: `│`,
      joinBody: `─`,
      joinLeft: `├`,
      joinRight: `┤`,
      joinJoin: `┼`
    }
  }));

  // Display category breakdown
  console.log(chalk.blue.bold('\nCategory Breakdown:\n'));
  
  for (const [categoryName, categoryData] of Object.entries(categories)) {
    const filteredIssues = categoryData.issues.filter(issue => 
      shouldIncludeIssue(issue.severity, minSeverity)
    );

    if (filteredIssues.length === 0) continue;

    console.log(chalk.bold(`${categoryName} (Score: ${getScoreColor(categoryData.score)}%)`));
    
    const issueData = [['Severity', 'File', 'Message']];
    
    filteredIssues.forEach(issue => {
      issueData.push([
        getSeverityColor(issue.severity),
        issue.file || 'N/A',
        issue.message
      ]);
    });

    console.log(table(issueData));
    console.log('');
  }
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return chalk.red.bold('CRITICAL');
    case 'high': return chalk.yellow.bold('HIGH');
    case 'medium': return chalk.blue.bold('MEDIUM');
    case 'low': return chalk.gray.bold('LOW');
    default: return severity.toUpperCase();
  }
}

function getScoreColor(score) {
  if (score >= 90) return chalk.green.bold(score);
  if (score >= 70) return chalk.yellow.bold(score);
  if (score >= 50) return chalk.red(score);
  return chalk.red.bold(score);
}

function shouldIncludeIssue(severity, minSeverity) {
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const minIndex = severityOrder.indexOf(minSeverity);
  const issueIndex = severityOrder.indexOf(severity);
  return issueIndex >= minIndex;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

program.parse();
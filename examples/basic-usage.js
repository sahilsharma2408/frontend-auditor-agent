#!/usr/bin/env node

/**
 * Basic Usage Examples for Frontend Auditor Agent
 * Demonstrates how to use the agent to audit repositories and handle context window limits
 */

import FrontendAuditorAgent from '../src/index.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function demonstrateBasicUsage() {
  console.log('🚀 Frontend Auditor Agent - Basic Usage Demo\n');

  // Check for GitHub token
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.log('💡 Create a .env file with your GitHub token:');
    console.log('   GITHUB_TOKEN=ghp_your_token_here');
    process.exit(1);
  }

  try {
    // Initialize the agent
    console.log('🔧 Initializing Frontend Auditor Agent...');
    const agent = new FrontendAuditorAgent(githubToken);

    // Example 1: Basic repository audit
    console.log('📊 Example 1: Basic Repository Audit');
    console.log('Target: DTSL/dnd-editor\n');
    
    const auditReport = await agent.auditRepository('DTSL', 'dnd-editor');
    
    console.log('✅ Audit completed!');
    console.log(`📈 Compliance Score: ${auditReport.summary.complianceScore}%`);
    console.log(`🔍 Total Issues Found: ${auditReport.summary.totalIssues}`);
    console.log(`🚨 Critical Issues: ${auditReport.summary.criticalIssues}`);
    console.log(`⚠️  High Issues: ${auditReport.summary.highIssues}\n`);

    // Example 2: Generate different report formats
    console.log('📝 Example 2: Generate Reports in Different Formats\n');
    
    const markdownReport = agent.generateReport(auditReport, 'markdown');
    const jsonReport = agent.generateReport(auditReport, 'json');
    const executiveSummary = agent.generateReport(auditReport, 'executive');

    // Save reports
    await agent.saveReport(markdownReport, './audit-report.md');
    await agent.saveReport(jsonReport, './audit-report.json');
    await agent.saveReport(executiveSummary, './executive-summary.md');

    console.log('✅ Generated reports:');
    console.log('   📄 audit-report.md (Detailed Markdown)');
    console.log('   📊 audit-report.json (Structured JSON)');
    console.log('   👔 executive-summary.md (Executive Summary)\n');

    // Example 3: Show how chunking prevents context window issues
    console.log('🔧 Example 3: Demonstrating Chunked Data Processing');
    console.log('(This prevents "context window exceeded" errors)\n');
    
    const repositoryMetadata = await agent.getRepositoryMetadata('DTSL', 'dnd-editor');
    
    console.log('📦 Repository Data Summary:');
    console.log(`   📁 Package Files: ${repositoryMetadata.packageFiles.length}`);
    console.log(`   ⚙️  Config Files: ${repositoryMetadata.configFiles.length}`);
    console.log(`   📅 Fetched At: ${repositoryMetadata.metadata.fetchedAt}`);
    console.log(`   📊 Total Files Processed: ${repositoryMetadata.metadata.totalFiles}\n`);

    // Show file size management
    const largeFiles = repositoryMetadata.packageFiles
      .concat(repositoryMetadata.configFiles)
      .filter(file => file.size > 10000)
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    if (largeFiles.length > 0) {
      console.log('📏 Largest Files Processed (showing size management):');
      largeFiles.forEach(file => {
        console.log(`   ${file.path}: ${(file.size / 1000).toFixed(1)}KB`);
      });
      console.log('');
    }

    // Example 4: Category breakdown
    console.log('📊 Example 4: Audit Category Breakdown\n');
    
    Object.entries(auditReport.categories).forEach(([category, data]) => {
      const score = data.score;
      const issueCount = data.issues.length;
      const emoji = score >= 90 ? '✅' : score >= 70 ? '⚠️' : '❌';
      
      console.log(`${emoji} ${category}: ${score}% (${issueCount} issues)`);
    });

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n💡 To run this demo:');
    console.log('   1. Set GITHUB_TOKEN in your .env file');
    console.log('   2. Run: node examples/basic-usage.js');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    
    if (error.message.includes('context window')) {
      console.log('\n🔧 Context Window Error Solutions:');
      console.log('   1. Reduce maxFileSize in src/config/mcp-config.js');
      console.log('   2. Add more exclusion patterns');
      console.log('   3. Process fewer files per batch');
    }
    
    process.exit(1);
  }
}

// Example function to show MCP configuration options
function showMCPConfiguration() {
  console.log('⚙️  MCP Configuration Options for Context Window Management:\n');
  
  const configExample = {
    chunking: {
      maxFileSize: 50000,        // Adjust this if hitting limits
      maxFilesPerBatch: 10,      // Reduce for smaller batches
      excludePatterns: [         // Add patterns to skip large files
        'node_modules/**',
        'coverage/**',
        'dist/**',
        'build/**'
      ]
    },
    rateLimiting: {
      requestsPerMinute: 60,
      batchDelay: 1000,          // Increase delay between requests
      retryAttempts: 3
    }
  };

  console.log('Example configuration:');
  console.log(JSON.stringify(configExample, null, 2));
  console.log('\n💡 Modify src/config/mcp-config.js to adjust these settings\n');
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Show configuration options first
  showMCPConfiguration();
  
  // Then run the main demo
  demonstrateBasicUsage().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
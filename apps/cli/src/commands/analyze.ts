import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { TypoChecker } from '@repo-polisher/core';
import path from 'path';

export const analyzeCommand = new Command('analyze')
  .description('Analyze a project for issues')
  .argument('[path]', 'Path to the project', '.')
  .action(async (projectPath) => {
    const spinner = ora('Initializing analysis...').start();
    
    try {
      const absolutePath = path.resolve(projectPath);
      const checker = new TypoChecker();
      
      const isAvailable = await checker.isAvailable();
      if (!isAvailable) {
        spinner.fail('Dependency missing');
        console.error(chalk.red('\nError: typos-cli is not installed or not in PATH.'));
        console.log(chalk.yellow('Please install it using Rust cargo:'));
        console.log('  cargo install typos-cli');
        console.log(chalk.yellow('Or via Homebrew on macOS:'));
        console.log('  brew install typos-cli');
        return;
      }

      spinner.text = `Analyzing ${absolutePath}...`;
      
      // Use a dummy IDs for CLI run
      const taskId = 'cli-task-' + Date.now();
      const projectId = 'cli-project-' + Date.now();

      const issues = await checker.check(absolutePath, taskId, projectId); // Remove progress callback for now as it's not implemented in TypoChecker.check signature in the viewed file
      
      spinner.succeed(`Analysis complete. Found ${issues.length} issues.`);

      if (issues.length > 0) {
        console.log('\nIssues found:');
        issues.forEach((issue) => {
          console.log(chalk.yellow(`\n[${issue.type}] ${issue.filePath}:${issue.line}:${issue.column}`));
          console.log(chalk.red(`  ${issue.original}`) + chalk.green(` -> ${issue.suggestion}`));
          if (issue.context) {
            console.log(chalk.gray(`  Context: ${issue.context.trim()}`));
          }
        });
      }

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

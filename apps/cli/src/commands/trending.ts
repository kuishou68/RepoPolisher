import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { GitHubAPI } from '@repo-polisher/core';

export const trendingCommand = new Command('trending')
  .description('Get trending AI projects')
  .option('-l, --limit <number>', 'Number of projects to fetch', '10')
  .action(async (options) => {
    const spinner = ora('Fetching trending AI projects...').start();
    
    try {
      const api = new GitHubAPI();
      const projects = await api.getTrendingAIProjects({
        limit: parseInt(options.limit, 10),
      });

      spinner.succeed(`Found ${projects.length} trending projects`);

      const table = new Table({
        head: [chalk.cyan('Name'), chalk.cyan('Stars'), chalk.cyan('Language'), chalk.cyan('Category')],
        style: { head: [], border: [] },
      });

      projects.forEach((p) => {
        table.push([
          chalk.bold(p.name),
          p.github?.stars.toLocaleString() || '0',
          Object.keys(p.languages)[0] || 'Unknown',
          p.category,
        ]);
      });

      console.log(table.toString());
      
    } catch (error) {
      spinner.fail('Failed to fetch trending projects');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
  });

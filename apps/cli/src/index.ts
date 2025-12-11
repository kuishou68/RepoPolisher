#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { trendingCommand } from './commands/trending';
import { analyzeCommand } from './commands/analyze';

const program = new Command();

program
  .name('repo-polisher')
  .description('AI-powered RepoPolisher CLI')
  .version('0.1.0');

program.addCommand(trendingCommand);
program.addCommand(analyzeCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

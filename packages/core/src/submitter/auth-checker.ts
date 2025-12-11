import { spawn } from 'child_process';
import type { AuthStatus } from '@repo-polisher/shared';
import { getGhSpawnConfig } from './gh-env';

export class AuthChecker {
  private ghCommand: string;
  private ghEnv: NodeJS.ProcessEnv;

  constructor() {
    const ghConfig = getGhSpawnConfig();
    if (!ghConfig.available) {
      this.ghCommand = '';
      this.ghEnv = process.env;
      return;
    }
    this.ghCommand = ghConfig.command;
    this.ghEnv = ghConfig.env;
  }

  async checkAll(): Promise<AuthStatus> {
    const [ghCli, oauth] = await Promise.all([this.checkGhCli(), this.checkOAuth()]);

    let recommended: AuthStatus['recommended'] = 'local';
    if (ghCli.installed && ghCli.authenticated) {
      recommended = 'gh-cli';
    } else if (oauth.authenticated) {
      recommended = 'oauth';
    }

    return {
      ghCli,
      oauth,
      recommended,
    };
  }

  async checkGhCli(): Promise<AuthStatus['ghCli']> {
    const result: AuthStatus['ghCli'] = {
      installed: false,
      authenticated: false,
    };

    // Check if gh is installed
    const version = await this.runCommand(['--version']);
    if (!version.success) {
      return result;
    }

    result.installed = true;
    const versionMatch = version.output.match(/gh version ([\d.]+)/);
    if (versionMatch) {
      result.version = versionMatch[1];
    }

    // Check auth status
    const authStatus = await this.runCommand(['auth', 'status']);
    if (authStatus.success || authStatus.output.includes('Logged in')) {
      result.authenticated = true;

      // Get username
      const userInfo = await this.runCommand(['api', 'user', '-q', '.login']);
      if (userInfo.success) {
        result.username = userInfo.output.trim();
      }
    }

    return result;
  }

  async checkOAuth(): Promise<AuthStatus['oauth']> {
    // OAuth status is managed by the app's token storage
    // This will be populated from the settings
    return {
      authenticated: false,
    };
  }

  private runCommand(args: string[]): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      if (!this.ghCommand) {
        resolve({ success: false, output: 'gh not configured' });
        return;
      }
      const child = spawn(this.ghCommand, args, {
        env: this.ghEnv,
      });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout || stderr,
        });
      });

      child.on('error', () => {
        resolve({
          success: false,
          output: '',
        });
      });
    });
  }
}

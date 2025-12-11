import { createTRPCReact } from '@trpc/react-query';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '../../electron/ipc/router';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [ipcLink()],
});

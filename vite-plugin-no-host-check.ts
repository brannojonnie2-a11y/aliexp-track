import { Plugin } from 'vite';

export function noHostCheck(): Plugin {
  return {
    name: 'no-host-check',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Allow all hosts in dev server
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Allow all hosts in preview server
        next();
      });
    },
  };
}

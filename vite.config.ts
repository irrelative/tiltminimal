import { defineConfig, loadEnv } from 'vite';
import { getEngineRevision } from './src/playtest/revision';

const getBasePath = (value: string | undefined): string => {
  const configuredBase = value?.trim();

  if (!configuredBase) {
    return '/';
  }

  const withLeadingSlash = configuredBase.startsWith('/')
    ? configuredBase
    : `/${configuredBase}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: getBasePath(env.VITE_BASE_PATH),
    define: {
      'import.meta.env.VITE_ENGINE_REVISION':
        JSON.stringify(getEngineRevision()),
    },
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          review: 'benchmarks/playtest-review.html',
        },
      },
    },
    plugins: [
      {
        name: 'playtest-revision',
        configureServer(server) {
          server.middlewares.use('/__playtest-revision', (_req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ revision: getEngineRevision() }));
          });
        },
      },
    ],
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.ts'],
    },
  };
});

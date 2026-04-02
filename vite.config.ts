import { defineConfig, loadEnv } from 'vite';

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
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.test.ts'],
    },
  };
});

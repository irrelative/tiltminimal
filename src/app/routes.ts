export type AppRoute = 'editor' | 'play' | 'rules' | 'physics';

export const normalizeBasePath = (basePath: string): string => {
  const trimmed = basePath.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

export const stripBasePath = (
  pathname: string,
  basePath: string,
): string => {
  const normalizedBase = normalizeBasePath(basePath);

  if (normalizedBase === '/') {
    return pathname;
  }

  if (pathname === normalizedBase.slice(0, -1)) {
    return '/';
  }

  if (pathname.startsWith(normalizedBase)) {
    const stripped = pathname.slice(normalizedBase.length - 1);
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }

  return pathname;
};

export const getAppRouteFromPathname = (
  pathname: string,
  basePath: string,
): AppRoute => {
  const routePath = stripBasePath(pathname, basePath);

  if (routePath === '/editor' || routePath === '/editor/') {
    return 'editor';
  }

  if (routePath === '/rules' || routePath === '/rules/') {
    return 'rules';
  }

  if (routePath === '/physics' || routePath === '/physics/') {
    return 'physics';
  }

  return 'play';
};

export const buildAppRoutePath = (
  route: AppRoute,
  basePath: string,
): string => {
  const normalizedBase = normalizeBasePath(basePath);

  if (route === 'play') {
    return normalizedBase;
  }

  return `${normalizedBase}${route}`;
};

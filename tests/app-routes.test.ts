import { describe, expect, it } from 'vitest';

import {
  buildAppRoutePath,
  getAppRouteFromPathname,
  normalizeBasePath,
  stripBasePath,
} from '../src/app/routes';

describe('app routes', () => {
  it('normalizes base paths for deployed project sites', () => {
    expect(normalizeBasePath('/tiltminimal')).toBe('/tiltminimal/');
    expect(normalizeBasePath('/tiltminimal/')).toBe('/tiltminimal/');
    expect(normalizeBasePath('/')).toBe('/');
  });

  it('strips the configured base path before route matching', () => {
    expect(stripBasePath('/tiltminimal/editor', '/tiltminimal/')).toBe(
      '/editor',
    );
    expect(stripBasePath('/tiltminimal/rules', '/tiltminimal/')).toBe(
      '/rules',
    );
    expect(stripBasePath('/tiltminimal/physics', '/tiltminimal/')).toBe(
      '/physics',
    );
    expect(stripBasePath('/tiltminimal/', '/tiltminimal/')).toBe('/');
  });

  it('detects the physics route and falls back to play for retired editor paths', () => {
    expect(getAppRouteFromPathname('/tiltminimal/editor', '/tiltminimal/')).toBe('play');
    expect(getAppRouteFromPathname('/tiltminimal/rules', '/tiltminimal/')).toBe('play');
    expect(
      getAppRouteFromPathname('/tiltminimal/physics', '/tiltminimal/'),
    ).toBe('physics');
    expect(getAppRouteFromPathname('/tiltminimal/', '/tiltminimal/')).toBe(
      'play',
    );
  });

  it('builds route paths relative to the configured base path', () => {
    expect(buildAppRoutePath('play', '/tiltminimal/')).toBe('/tiltminimal/');
    expect(buildAppRoutePath('physics', '/tiltminimal/')).toBe(
      '/tiltminimal/physics',
    );
  });
});

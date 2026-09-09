import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  UserSettingsStore,
} from '../src/app/user-settings';

describe('user settings', () => {
  it('defaults sound and ball visuals on at full volume', () => {
    const store = new UserSettingsStore(() => ({
      getItem: () => null,
      setItem: () => {},
    }));
    expect(store.load()).toEqual(DEFAULT_USER_SETTINGS);
  });
  it('persists independent preferences across store instances', () => {
    let saved = '';
    const storage = {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    const settings = {
      soundEnabled: false,
      soundVolume: 0.35,
      showSpinMarker: false,
      showBallTrail: true,
    };
    new UserSettingsStore(() => storage).save(settings);
    expect(new UserSettingsStore(() => storage).load()).toEqual(settings);
  });
  it.each([
    '{broken',
    'null',
    '{"soundEnabled":"false","soundVolume":2,"showSpinMarker":0}',
    '[]',
  ])('ignores invalid saved settings: %s', (saved) => {
    expect(
      new UserSettingsStore(() => ({
        getItem: () => saved,
        setItem: () => {},
      })).load(),
    ).toEqual(DEFAULT_USER_SETTINGS);
  });
  it('works when storage is blocked', () => {
    const store = new UserSettingsStore(() => {
      throw new Error('blocked');
    });
    expect(store.load()).toEqual(DEFAULT_USER_SETTINGS);
    expect(() =>
      store.save({ ...DEFAULT_USER_SETTINGS, soundEnabled: false }),
    ).not.toThrow();
  });
});

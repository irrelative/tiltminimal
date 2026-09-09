export interface UserSettings {
  soundEnabled: boolean;
  soundVolume: number;
  showSpinMarker: boolean;
  showBallTrail: boolean;
}

export const DEFAULT_USER_SETTINGS: Readonly<UserSettings> = {
  soundEnabled: true,
  soundVolume: 1,
  showSpinMarker: true,
  showBallTrail: true,
};
const storageKey = 'pinball.settings.v1';
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export class UserSettingsStore {
  constructor(
    private readonly storage: () => SettingsStorage = () => window.localStorage,
  ) {}

  load(): UserSettings {
    const settings = { ...DEFAULT_USER_SETTINGS };
    try {
      const saved: unknown = JSON.parse(
        this.storage().getItem(storageKey) ?? 'null',
      );
      if (!saved || typeof saved !== 'object') return settings;
      const values = saved as Record<string, unknown>;
      for (const key of [
        'soundEnabled',
        'showSpinMarker',
        'showBallTrail',
      ] as const) {
        if (key in saved && typeof values[key] === 'boolean')
          settings[key] = values[key];
      }
      if (
        'soundVolume' in saved &&
        typeof saved.soundVolume === 'number' &&
        Number.isFinite(saved.soundVolume) &&
        saved.soundVolume >= 0 &&
        saved.soundVolume <= 1
      ) {
        settings.soundVolume = saved.soundVolume;
      }
    } catch {
      /* Keep defaults when browser storage is unavailable or malformed. */
    }
    return settings;
  }

  save(settings: UserSettings): void {
    try {
      this.storage().setItem(storageKey, JSON.stringify(settings));
    } catch {
      /* Settings still apply for this page when storage is unavailable. */
    }
  }
}

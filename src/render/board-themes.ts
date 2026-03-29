import type { BoardThemeId } from '../types/board-definition';

export interface BoardTheme {
  id: BoardThemeId;
  label: string;
  backgroundTop: string;
  backgroundMid: string;
  backgroundBottom: string;
  glowPrimary: string;
  glowSecondary: string;
  guideMetalPrimary: string;
  guideMetalSecondary: string;
  guideRubberPrimary: string;
  guideRubberSecondary: string;
  bumperColors: [string, string, string];
  bumperRing: string;
  bumperCap: string;
  bumperText: string;
  postMetalFill: string;
  postMetalRing: string;
  postMetalCore: string;
  postRubberFill: string;
  postRubberRing: string;
  postRubberCore: string;
  plungerLaneFill: string;
  plungerLaneStroke: string;
  plungerGuidePrimary: string;
  plungerGuideSecondary: string;
  plungerBodyFill: string;
  plungerBodyStroke: string;
  plungerKnob: string;
  standupLitFill: string;
  standupFill: string;
  targetStroke: string;
  dropUpFill: string;
  dropDownFill: string;
  dropStroke: string;
  saucerOccupiedFill: string;
  saucerFill: string;
  saucerCoreOccupied: string;
  saucerCore: string;
  saucerRing: string;
  spinnerFill: string;
  spinnerStroke: string;
  spinnerCap: string;
  rolloverLitFill: string;
  rolloverFill: string;
  rolloverStrokeLit: string;
  rolloverStroke: string;
  flipperFill: string;
  flipperStroke: string;
  flipperCore: string;
  ballFill: string;
  ballStroke: string;
  hudText: string;
  hudMuted: string;
  launchMeterTrack: string;
  launchMeterFill: string;
  launchMeterStroke: string;
  launchMarkerStroke: string;
  launchMarkerStrokeActive: string;
  launchMarkerFill: string;
}

export const DEFAULT_BOARD_THEME_ID: BoardThemeId = 'classic';

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    backgroundTop: '#fed41d',
    backgroundMid: '#ffd94d',
    backgroundBottom: '#f7bd17',
    glowPrimary: 'rgba(255, 255, 255, 0.28)',
    glowSecondary: 'rgba(112, 209, 244, 0.24)',
    guideMetalPrimary: '#70d1f4',
    guideMetalSecondary: '#2f6db2',
    guideRubberPrimary: '#f89c2a',
    guideRubberSecondary: 'rgba(233, 79, 55, 0.85)',
    bumperColors: ['#f26ca7', '#8dc63f', '#70d1f4'],
    bumperRing: '#fff7d6',
    bumperCap: '#fff7d6',
    bumperText: 'rgba(34, 48, 74, 0.9)',
    postMetalFill: '#fff7d6',
    postMetalRing: '#2f6db2',
    postMetalCore: '#2f6db2',
    postRubberFill: '#e94f37',
    postRubberRing: '#fff7d6',
    postRubberCore: '#22304a',
    plungerLaneFill: 'rgba(34, 48, 74, 0.14)',
    plungerLaneStroke: 'rgba(47, 109, 178, 0.45)',
    plungerGuidePrimary: '#70d1f4',
    plungerGuideSecondary: '#2f6db2',
    plungerBodyFill: '#fff7d6',
    plungerBodyStroke: '#2f6db2',
    plungerKnob: '#e94f37',
    standupLitFill: '#fff7d6',
    standupFill: '#f89c2a',
    targetStroke: '#22304a',
    dropUpFill: '#e94f37',
    dropDownFill: 'rgba(255, 247, 214, 0.45)',
    dropStroke: '#fff7d6',
    saucerOccupiedFill: '#8dc63f',
    saucerFill: '#22304a',
    saucerCoreOccupied: '#fff7d6',
    saucerCore: 'rgba(255, 247, 214, 0.35)',
    saucerRing: '#70d1f4',
    spinnerFill: '#70d1f4',
    spinnerStroke: '#22304a',
    spinnerCap: '#fff7d6',
    rolloverLitFill: '#8dc63f',
    rolloverFill: 'rgba(255, 247, 214, 0.24)',
    rolloverStrokeLit: '#fff7d6',
    rolloverStroke: '#2f6db2',
    flipperFill: '#e94f37',
    flipperStroke: '#fff7d6',
    flipperCore: '#fff7d6',
    ballFill: '#fffdf7',
    ballStroke: 'rgba(34, 48, 74, 0.25)',
    hudText: '#22304a',
    hudMuted: 'rgba(34, 48, 74, 0.85)',
    launchMeterTrack: 'rgba(34, 48, 74, 0.18)',
    launchMeterFill: '#e94f37',
    launchMeterStroke: '#2f6db2',
    launchMarkerStroke: 'rgba(0, 0, 0, 0.82)',
    launchMarkerStrokeActive: 'rgba(0, 0, 0, 0.95)',
    launchMarkerFill: 'rgba(0, 0, 0, 0.12)',
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight Neon',
    backgroundTop: '#13233f',
    backgroundMid: '#1a3768',
    backgroundBottom: '#0c1830',
    glowPrimary: 'rgba(124, 214, 255, 0.16)',
    glowSecondary: 'rgba(255, 90, 163, 0.16)',
    guideMetalPrimary: '#8ae0ff',
    guideMetalSecondary: '#3dc0ff',
    guideRubberPrimary: '#ff9f5c',
    guideRubberSecondary: 'rgba(255, 112, 88, 0.9)',
    bumperColors: ['#ff5fa2', '#8cff66', '#6bd3ff'],
    bumperRing: '#f9f4ff',
    bumperCap: '#fff7ea',
    bumperText: 'rgba(16, 24, 38, 0.92)',
    postMetalFill: '#f0f7ff',
    postMetalRing: '#49b9ff',
    postMetalCore: '#113356',
    postRubberFill: '#ff6b56',
    postRubberRing: '#fff3ea',
    postRubberCore: '#1b2435',
    plungerLaneFill: 'rgba(10, 21, 49, 0.2)',
    plungerLaneStroke: 'rgba(73, 185, 255, 0.48)',
    plungerGuidePrimary: '#86ddff',
    plungerGuideSecondary: '#2c8fd6',
    plungerBodyFill: '#fff6df',
    plungerBodyStroke: '#3e92d0',
    plungerKnob: '#ff7a57',
    standupLitFill: '#fff2d8',
    standupFill: '#ff9d5a',
    targetStroke: '#13243d',
    dropUpFill: '#ff6950',
    dropDownFill: 'rgba(255, 244, 224, 0.42)',
    dropStroke: '#fff2d8',
    saucerOccupiedFill: '#77ef73',
    saucerFill: '#14233f',
    saucerCoreOccupied: '#fff4da',
    saucerCore: 'rgba(255, 244, 224, 0.34)',
    saucerRing: '#86ddff',
    spinnerFill: '#7ad8ff',
    spinnerStroke: '#102036',
    spinnerCap: '#fff5df',
    rolloverLitFill: '#79e672',
    rolloverFill: 'rgba(255, 244, 224, 0.2)',
    rolloverStrokeLit: '#fff5df',
    rolloverStroke: '#4798d9',
    flipperFill: '#ff6b56',
    flipperStroke: '#fff5df',
    flipperCore: '#fff5df',
    ballFill: '#f8fbff',
    ballStroke: 'rgba(16, 24, 38, 0.3)',
    hudText: '#eff6ff',
    hudMuted: 'rgba(239, 246, 255, 0.84)',
    launchMeterTrack: 'rgba(239, 246, 255, 0.18)',
    launchMeterFill: '#ff7a57',
    launchMeterStroke: '#5dbef4',
    launchMarkerStroke: 'rgba(239, 246, 255, 0.76)',
    launchMarkerStrokeActive: 'rgba(255, 255, 255, 0.95)',
    launchMarkerFill: 'rgba(239, 246, 255, 0.1)',
  },
  sunburst: {
    id: 'sunburst',
    label: 'Sunburst',
    backgroundTop: '#ffcc88',
    backgroundMid: '#ffb95f',
    backgroundBottom: '#ea7b44',
    glowPrimary: 'rgba(255, 247, 226, 0.28)',
    glowSecondary: 'rgba(255, 115, 72, 0.18)',
    guideMetalPrimary: '#f6f4e8',
    guideMetalSecondary: '#8b4b2d',
    guideRubberPrimary: '#ff8c42',
    guideRubberSecondary: 'rgba(196, 66, 35, 0.9)',
    bumperColors: ['#ff6767', '#ffd166', '#ff9f1c'],
    bumperRing: '#fff8ea',
    bumperCap: '#fff6dc',
    bumperText: 'rgba(72, 34, 19, 0.9)',
    postMetalFill: '#fff5e4',
    postMetalRing: '#915331',
    postMetalCore: '#7b3e24',
    postRubberFill: '#d8572a',
    postRubberRing: '#fff3de',
    postRubberCore: '#58291a',
    plungerLaneFill: 'rgba(106, 49, 29, 0.12)',
    plungerLaneStroke: 'rgba(145, 83, 49, 0.4)',
    plungerGuidePrimary: '#fff0d3',
    plungerGuideSecondary: '#a65b34',
    plungerBodyFill: '#fff0dc',
    plungerBodyStroke: '#97512e',
    plungerKnob: '#d8572a',
    standupLitFill: '#fff4dd',
    standupFill: '#ff8c42',
    targetStroke: '#58291a',
    dropUpFill: '#dd5b38',
    dropDownFill: 'rgba(255, 240, 220, 0.42)',
    dropStroke: '#fff2df',
    saucerOccupiedFill: '#f0b845',
    saucerFill: '#66311f',
    saucerCoreOccupied: '#fff5e2',
    saucerCore: 'rgba(255, 240, 220, 0.32)',
    saucerRing: '#fff0d3',
    spinnerFill: '#fff0d3',
    spinnerStroke: '#5b2d1c',
    spinnerCap: '#fff7ea',
    rolloverLitFill: '#f2bf4f',
    rolloverFill: 'rgba(255, 240, 220, 0.2)',
    rolloverStrokeLit: '#fff6e6',
    rolloverStroke: '#9b5731',
    flipperFill: '#d8572a',
    flipperStroke: '#fff6e6',
    flipperCore: '#fff6e6',
    ballFill: '#fffaf2',
    ballStroke: 'rgba(72, 34, 19, 0.22)',
    hudText: '#4d2416',
    hudMuted: 'rgba(77, 36, 22, 0.82)',
    launchMeterTrack: 'rgba(72, 34, 19, 0.16)',
    launchMeterFill: '#d8572a',
    launchMeterStroke: '#9b5731',
    launchMarkerStroke: 'rgba(72, 34, 19, 0.8)',
    launchMarkerStrokeActive: 'rgba(72, 34, 19, 0.95)',
    launchMarkerFill: 'rgba(72, 34, 19, 0.08)',
  },
  grayscale: {
    id: 'grayscale',
    label: 'Grayscale',
    backgroundTop: '#d9d9d9',
    backgroundMid: '#bfbfbf',
    backgroundBottom: '#989898',
    glowPrimary: 'rgba(255, 255, 255, 0.2)',
    glowSecondary: 'rgba(60, 60, 60, 0.12)',
    guideMetalPrimary: '#ececec',
    guideMetalSecondary: '#6d6d6d',
    guideRubberPrimary: '#b1b1b1',
    guideRubberSecondary: 'rgba(82, 82, 82, 0.84)',
    bumperColors: ['#8a8a8a', '#5e5e5e', '#b5b5b5'],
    bumperRing: '#f7f7f7',
    bumperCap: '#efefef',
    bumperText: 'rgba(28, 28, 28, 0.9)',
    postMetalFill: '#f0f0f0',
    postMetalRing: '#6f6f6f',
    postMetalCore: '#505050',
    postRubberFill: '#8d8d8d',
    postRubberRing: '#f0f0f0',
    postRubberCore: '#303030',
    plungerLaneFill: 'rgba(30, 30, 30, 0.12)',
    plungerLaneStroke: 'rgba(90, 90, 90, 0.36)',
    plungerGuidePrimary: '#d9d9d9',
    plungerGuideSecondary: '#7a7a7a',
    plungerBodyFill: '#f0f0f0',
    plungerBodyStroke: '#6e6e6e',
    plungerKnob: '#7f7f7f',
    standupLitFill: '#f3f3f3',
    standupFill: '#acacac',
    targetStroke: '#2a2a2a',
    dropUpFill: '#8b8b8b',
    dropDownFill: 'rgba(240, 240, 240, 0.42)',
    dropStroke: '#efefef',
    saucerOccupiedFill: '#6d6d6d',
    saucerFill: '#333333',
    saucerCoreOccupied: '#f4f4f4',
    saucerCore: 'rgba(240, 240, 240, 0.28)',
    saucerRing: '#dcdcdc',
    spinnerFill: '#dcdcdc',
    spinnerStroke: '#2f2f2f',
    spinnerCap: '#f4f4f4',
    rolloverLitFill: '#6f6f6f',
    rolloverFill: 'rgba(240, 240, 240, 0.18)',
    rolloverStrokeLit: '#f4f4f4',
    rolloverStroke: '#7a7a7a',
    flipperFill: '#8d8d8d',
    flipperStroke: '#f4f4f4',
    flipperCore: '#f4f4f4',
    ballFill: '#fbfbfb',
    ballStroke: 'rgba(28, 28, 28, 0.24)',
    hudText: '#222222',
    hudMuted: 'rgba(34, 34, 34, 0.82)',
    launchMeterTrack: 'rgba(34, 34, 34, 0.16)',
    launchMeterFill: '#7f7f7f',
    launchMeterStroke: '#666666',
    launchMarkerStroke: 'rgba(0, 0, 0, 0.75)',
    launchMarkerStrokeActive: 'rgba(0, 0, 0, 0.92)',
    launchMarkerFill: 'rgba(0, 0, 0, 0.1)',
  },
};

export const getBoardTheme = (themeId: BoardThemeId): BoardTheme =>
  BOARD_THEMES[themeId] ?? BOARD_THEMES[DEFAULT_BOARD_THEME_ID];

import { describe, expect, it } from 'vitest';

import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { validateCompiledBoardLayout } from '../src/boards/layout-validation';
import { mirrorMatchTable } from '../src/boards/tables/mirror-match';
import { createInitialGameState } from '../src/game/game-state';
import { stepGame } from '../src/game/physics-engine';
import {
  applyRulesFrame,
  initializeRulesState,
} from '../src/game/rules-engine';
import { analyzeBoard } from '../src/validation/table-analysis';
import { idleInput, launchBall } from './helpers/game-fixture';

describe('mirrorMatchTable', () => {
  it('exposes a symmetric solid-state table with conventional lower lanes', () => {
    expect(mirrorMatchTable.name).toBe('Mirror Match');
    expect(mirrorMatchTable.themeId).toBe('mirror-match');
    expect(mirrorMatchTable.bumpers).toHaveLength(3);
    expect(mirrorMatchTable.standupTargets).toHaveLength(6);
    expect(mirrorMatchTable.spinners).toHaveLength(2);
    expect(mirrorMatchTable.saucers).toHaveLength(1);
    expect(mirrorMatchTable.slingshots).toHaveLength(2);
    expect(mirrorMatchTable.rollovers).toHaveLength(3);
    expect(mirrorMatchTable.flippers).toHaveLength(2);
    expect(
      mirrorMatchTable.guides.filter((guide) => guide.plane === 'raised'),
    ).toHaveLength(8);

    expect(BUILT_IN_TABLES.some((table) => table.id === 'mirror-match')).toBe(
      true,
    );
  });

  it('mirrors the main shot devices across the centerline', () => {
    const leftFlipper = mirrorMatchTable.flippers[0]!;
    const rightFlipper = mirrorMatchTable.flippers[1]!;
    const leftSling = mirrorMatchTable.slingshots[0]!;
    const rightSling = mirrorMatchTable.slingshots[1]!;
    const leftSpinner = mirrorMatchTable.spinners[0]!;
    const rightSpinner = mirrorMatchTable.spinners[1]!;

    expect(Math.abs(leftFlipper.x + rightFlipper.x - 900)).toBeLessThanOrEqual(
      20,
    );
    expect(leftFlipper.y).toBe(rightFlipper.y);
    expect(Math.abs(leftSling.x + rightSling.x - 900)).toBeLessThanOrEqual(20);
    expect(leftSling.y).toBe(rightSling.y);
    expect(Math.abs(leftSpinner.x + rightSpinner.x - 900)).toBeLessThanOrEqual(
      20,
    );
    expect(leftSpinner.y).toBe(rightSpinner.y);

    for (let index = 0; index < 3; index += 1) {
      const left = mirrorMatchTable.standupTargets[index]!;
      const right = mirrorMatchTable.standupTargets[index + 3]!;
      expect(Math.abs(left.x + right.x - 900)).toBeLessThanOrEqual(20);
      expect(left.y).toBe(right.y);
    }
  });

  it('clears layout, geometry, and playability validation', () => {
    expect(
      validateCompiledBoardLayout(mirrorMatchTable).filter(
        (diagnostic) => diagnostic.severity === 'error',
      ),
    ).toEqual([]);
    expect(analyzeBoard(mirrorMatchTable)).toEqual([]);
  });

  it('full-plunges into live upper play', () => {
    let launched = launchBall(mirrorMatchTable);
    let minY = launched.ball.position.y;

    for (let step = 0; step < 120; step += 1) {
      launched = stepGame(launched, mirrorMatchTable, idleInput, 1 / 60);
      minY = Math.min(minY, launched.ball.position.y);
    }

    expect(minY).toBeLessThan(280);
  });

  it('keeps both flipper cradle regions clear of flat return rails', () => {
    expect(mirrorMatchTable.flippers.map((flipper) => flipper.length)).toEqual([
      150, 150,
    ]);
    expect(
      mirrorMatchTable.guides.filter((guide) => guide.plane === 'raised'),
    ).toHaveLength(8);
    expect(
      validateCompiledBoardLayout(mirrorMatchTable).some(
        (diagnostic) => diagnostic.code === 'flipper-keepout',
      ),
    ).toBe(false);
  });

  it('enables the center saucer after both target banks complete', () => {
    const state = initializeRulesState(
      createInitialGameState(mirrorMatchTable),
      mirrorMatchTable,
    );
    const bankHits = mirrorMatchTable.standupTargets.map((target, index) => ({
      type: 'standup-target-hit' as const,
      index,
      score: target.score,
      tick: 1,
    }));

    applyRulesFrame(state, mirrorMatchTable, bankHits, 1 / 60);

    expect(state.rules.machineValues['mirror-match-ready']).toBe(true);

    applyRulesFrame(
      state,
      mirrorMatchTable,
      [
        {
          type: 'saucer-captured',
          index: 0,
          score: mirrorMatchTable.saucers[0]!.score,
          tick: 2,
        },
      ],
      1 / 60,
    );

    expect(state.rules.machineValues['mirror-match-ready']).toBe(false);
    expect(state.rules.bonusMultiplier).toBe(2);
    expect(state.score).toBe(16000);
  });
});

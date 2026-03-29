import { describe, expect, it } from 'vitest';

import { classicTable } from '../src/boards/classic-table';
import type { ContactData } from '../src/game/contact-types';
import { createBallState } from '../src/game/game-state';
import { getSurfaceMaterial } from '../src/game/materials';
import { getContactTangent, resolveBallContact } from '../src/game/spin-solver';

describe('resolveBallContact', () => {
  it('generates spin from tangential slip', () => {
    const ball = createBallState(classicTable);
    ball.linearVelocity.x = -120;
    ball.linearVelocity.y = 260;

    const contact = createContact('metalGuide');

    const result = resolveBallContact(ball, contact);

    expect(result.normalImpulse).toBeGreaterThan(0);
    expect(Math.abs(result.tangentImpulse)).toBeGreaterThan(0);
    expect(getSpinMagnitude(ball)).toBeGreaterThan(0);
  });

  it('lets grippier materials transfer more spin', () => {
    const metalBall = createBallState(classicTable);
    metalBall.linearVelocity.x = -120;
    metalBall.linearVelocity.y = 260;

    const rubberBall = createBallState(classicTable);
    rubberBall.linearVelocity.x = -120;
    rubberBall.linearVelocity.y = 260;

    resolveBallContact(metalBall, createContact('metalGuide'));
    resolveBallContact(rubberBall, createContact('flipperRubber'));

    expect(getSpinMagnitude(rubberBall)).toBeGreaterThan(
      getSpinMagnitude(metalBall),
    );
  });

  it('reduces rebound when the moving surface has finite effective mass', () => {
    const rigidBall = createBallState(classicTable);
    rigidBall.linearVelocity.x = 0;
    rigidBall.linearVelocity.y = 120;

    const finiteMassBall = createBallState(classicTable);
    finiteMassBall.linearVelocity.x = 0;
    finiteMassBall.linearVelocity.y = 120;

    resolveBallContact(
      rigidBall,
      createContact('flipperRubber', {
        normal: { x: 0, y: -1 },
        surfaceVelocity: { x: 0, y: -3000 },
        restitutionScale: 0.58,
      }),
    );
    resolveBallContact(
      finiteMassBall,
      createContact('flipperRubber', {
        normal: { x: 0, y: -1 },
        surfaceVelocity: { x: 0, y: -3000 },
        surfaceEffectiveMass: 0.08,
        restitutionScale: 0.58,
      }),
    );

    expect(Math.abs(finiteMassBall.linearVelocity.y)).toBeLessThan(
      Math.abs(rigidBall.linearVelocity.y),
    );
  });
});

const createContact = (
  materialName: Parameters<typeof getSurfaceMaterial>[0],
  overrides: Partial<ContactData> = {},
): ContactData => {
  const normal = overrides.normal ?? { x: 1, y: 0 };

  return {
    point: { x: 100, y: 100 },
    normal,
    tangent: getContactTangent(normal),
    overlap: overrides.overlap ?? 3,
    surfaceVelocity: overrides.surfaceVelocity ?? { x: 0, y: 0 },
    material: getSurfaceMaterial(materialName),
    surfaceEffectiveMass: overrides.surfaceEffectiveMass,
    restitutionScale: overrides.restitutionScale,
  };
};

const getSpinMagnitude = (
  ball: ReturnType<typeof createBallState>,
): number =>
  Math.hypot(ball.angularVelocity.x, ball.angularVelocity.y);

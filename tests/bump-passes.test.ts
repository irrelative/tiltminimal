import { describe, expect, it } from 'vitest';
import { BUILT_IN_TABLES } from '../src/boards/table-library';
import { stepGameFrame } from '../src/game/physics-engine';
import { getSlingshotCollision } from '../src/game/slingshot-geometry';
import { idleInput } from './helpers/game-fixture';
import { createPostPassCradle, isSettledOn } from './helpers/post-pass';

describe('bump passes using a single forward nudge', () => {
  for (const { id, board } of BUILT_IN_TABLES) {
    for (const [source, flipper] of board.flippers.entries()) {
      it(`${id} flipper ${source + 1} transfers to a held opposite flipper without re-flipping`, () => {
        const cradle = createPostPassCradle(board, source);
        expect(isSettledOn(cradle, board, source)).toBe(true);
        const receiver =
          id === 'harlem-globetrotters' ? (source === 1 ? 2 : 1) : 1 - source;
        const run = (delay: number) => {
          let state = structuredClone(cradle);
          let settled = 0;
          let scoringContact = false;
          let postContact = false;
          let slingContact = false;
          for (let frame = 0; frame < 360; frame++) {
            const result = stepGameFrame(
              state,
              board,
              {
                ...idleInput,
                leftPressed: true,
                rightPressed: true,
                [flipper.side === 'left' ? 'leftPressed' : 'rightPressed']:
                  false,
                nudgeUpPressed: frame === delay,
              },
              1 / 120,
            );
            state = result.state;
            scoringContact ||= result.events.some((event) => 'score' in event);
            postContact ||= board.posts.some(
              (post) =>
                Math.hypot(
                  state.ball.position.x - post.x,
                  state.ball.position.y - post.y,
                ) <=
                post.radius + state.ball.radius + 0.5,
            );
            slingContact ||= board.slingshots.some(
              (sling) =>
                !!getSlingshotCollision(
                  state.ball.position,
                  state.ball.radius + 0.5,
                  board,
                  sling,
                ),
            );
            settled = isSettledOn(state, board, receiver) ? settled + 1 : 0;
            if (settled >= 60 || state.status !== 'playing') break;
          }
          return {
            caught: settled >= 60,
            scoringContact,
            postContact,
            slingContact,
          };
        };
        const timings =
          id === 'harlem-globetrotters'
            ? [4, 6]
            : id === 'andromeda'
              ? [13, 14]
              : id === 'double-crossed'
                ? [12]
                : [12, 13];
        for (const delay of timings) {
          expect(run(delay), `nudge at frame ${delay}`).toEqual({
            caught: true,
            scoringContact: false,
            postContact: false,
            slingContact: false,
          });
        }
        if (id === 'double-crossed') expect(run(13).caught).toBe(false);
        expect(
          run(-1).caught,
          'release alone must not produce the same catch',
        ).toBe(false);
      });
    }
  }
});

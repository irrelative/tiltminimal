import { getSurfaceMaterial } from '../game/materials';
import {
  getPlungerGuideBottomY,
  getPlungerGuideSegments,
  getPlungerGuideTopY,
  getPlungerLaneHalfWidth,
} from '../game/plunger-geometry';
import type { GameState } from '../game/game-state';
import type { BallState } from '../game/game-state';
import { getBoardTheme } from './board-themes';
import type {
  BoardDefinition,
  FlipperDefinition,
} from '../types/board-definition';
import {
  drawGuidePath,
  drawOrientedPlate,
  getRenderedFlipperAngle,
  getRenderedSlingshotAngle,
  traceFlipperPath,
  traceSlingshotPath,
  UI_FONT_FAMILY,
} from './canvas-renderer-shared';
import {
  getFlipperBaseRadius,
  getFlipperTipRadius,
} from '../game/flipper-geometry';

export const drawBoard = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  drawStaticBoardBase(context, board, {
    showBumperScores: Boolean(state),
  });
  drawDynamicBoard(context, board, state);
  drawStaticBoardOverlay(context, board);
};

export const drawStaticBoardBase = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  options: {
    showBumperScores?: boolean;
  } = {},
): void => {
  drawBackground(context, board);
  drawGuides(context, board, 'playfield');
  drawPlungerLane(context, board);
  drawPosts(context, board);
  drawBumpers(context, board, options.showBumperScores ?? false);
};

export const drawDynamicBoard = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  drawPlungerBody(context, board, state);
  drawStandupTargets(context, board, state);
  drawDropTargets(context, board, state);
  drawSlingshots(context, board, state);
  drawSaucers(context, board, state);
  drawSpinners(context, board, state);
  drawRollovers(context, board, state);

  for (const [index, flipper] of board.flippers.entries()) {
    drawFlipper(
      context,
      board,
      flipper,
      state
        ? getRenderedFlipperAngle(state, flipper, index)
        : flipper.restingAngle,
    );
  }
};

export const drawStaticBoardOverlay = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  drawGuides(context, board, 'raised');
};

export const drawBall = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state: GameState,
): void => {
  drawBallState(context, board, state.ball);
};

export const drawBallState = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  ball: BallState,
): void => {
  const theme = getBoardTheme(board.themeId);
  drawBallMotionStreak(context, theme, ball);

  context.fillStyle = theme.ballFill;
  context.beginPath();
  context.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
  context.fill();
  drawBallSpinPips(context, ball);

  context.strokeStyle = theme.ballStroke;
  context.lineWidth = 2;
  context.stroke();
};

const drawBallMotionStreak = (
  context: CanvasRenderingContext2D,
  theme: ReturnType<typeof getBoardTheme>,
  ball: BallState,
): void => {
  const speed = Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y);
  const minTrailSpeed = 80;

  if (speed <= minTrailSpeed) {
    return;
  }

  const trailRatio = Math.min(1, (speed - minTrailSpeed) / 1500);
  const direction = {
    x: ball.linearVelocity.x / speed,
    y: ball.linearVelocity.y / speed,
  };
  const headInset = ball.radius * 0.1;
  const tailLength = ball.radius * 1.4 + trailRatio * 64;
  const start = {
    x: ball.position.x - direction.x * (headInset + tailLength),
    y: ball.position.y - direction.y * (headInset + tailLength),
  };
  const end = {
    x: ball.position.x - direction.x * headInset,
    y: ball.position.y - direction.y * headInset,
  };
  const haloGradient = context.createLinearGradient(start.x, start.y, end.x, end.y);
  const coreGradient = context.createLinearGradient(start.x, start.y, end.x, end.y);

  haloGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  haloGradient.addColorStop(
    0.45,
    `rgba(255, 255, 255, ${0.08 + trailRatio * 0.1})`,
  );
  haloGradient.addColorStop(
    1,
    `rgba(255, 255, 255, ${0.22 + trailRatio * 0.18})`,
  );
  coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  coreGradient.addColorStop(
    0.6,
    `rgba(255, 252, 244, ${0.18 + trailRatio * 0.12})`,
  );
  coreGradient.addColorStop(
    1,
    `rgba(255, 255, 255, ${0.42 + trailRatio * 0.28})`,
  );

  context.save();
  context.globalCompositeOperation = 'screen';
  context.lineCap = 'round';

  context.strokeStyle = haloGradient;
  context.lineWidth = ball.radius * (1.45 + trailRatio * 0.5);
  context.shadowColor = theme.ballFill;
  context.shadowBlur = 12 + trailRatio * 12;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.strokeStyle = coreGradient;
  context.lineWidth = ball.radius * (0.7 + trailRatio * 0.22);
  context.shadowBlur = 6 + trailRatio * 6;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.restore();
};

const drawBallSpinPips = (
  context: CanvasRenderingContext2D,
  ball: BallState,
): void => {
  const radius = ball.radius;
  const speed = Math.hypot(ball.linearVelocity.x, ball.linearVelocity.y);
  const pipAlpha = 0.24 + Math.min(0.38, speed / 3600);
  const basePoint = rotateBallSurfacePoint(
    { x: 0.34, y: -0.28, z: 0.9 },
    ball.angularPosition,
  );

  drawBallSpinPip(context, ball, basePoint, radius, pipAlpha);
  drawBallSpinPip(
    context,
    ball,
    { x: -basePoint.x, y: -basePoint.y, z: -basePoint.z },
    radius,
    pipAlpha,
  );
};

const drawBallSpinPip = (
  context: CanvasRenderingContext2D,
  ball: BallState,
  point: { x: number; y: number; z: number },
  ballRadius: number,
  alpha: number,
): void => {
  if (point.z <= -0.08) {
    return;
  }

  const visibility = Math.max(0.12, (point.z + 1) / 2);
  const pipRadius = ballRadius * (0.12 + visibility * 0.1);
  const center = {
    x: ball.position.x + point.x * ballRadius * 0.74,
    y: ball.position.y + point.y * ballRadius * 0.74,
  };

  context.save();
  context.fillStyle = `rgba(20, 28, 40, ${alpha * visibility})`;
  context.beginPath();
  context.arc(center.x, center.y, pipRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const rotateBallSurfacePoint = (
  point: { x: number; y: number; z: number },
  angularPosition: GameState['ball']['angularPosition'],
): { x: number; y: number; z: number } => {
  const cosX = Math.cos(angularPosition.x);
  const sinX = Math.sin(angularPosition.x);
  const cosY = Math.cos(angularPosition.y);
  const sinY = Math.sin(angularPosition.y);
  const afterX = {
    x: point.x,
    y: point.y * cosX - point.z * sinX,
    z: point.y * sinX + point.z * cosX,
  };

  return {
    x: afterX.x * cosY + afterX.z * sinY,
    y: afterX.y,
    z: -afterX.x * sinY + afterX.z * cosY,
  };
};

const drawBackground = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  const theme = getBoardTheme(board.themeId);
  const gradient = context.createLinearGradient(0, 0, 0, board.height);
  gradient.addColorStop(0, theme.backgroundTop);
  gradient.addColorStop(0.38, theme.backgroundMid);
  gradient.addColorStop(1, theme.backgroundBottom);

  context.fillStyle = gradient;
  context.fillRect(0, 0, board.width, board.height);

  context.fillStyle = theme.glowPrimary;
  context.beginPath();
  context.arc(180, 220, 180, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = theme.glowSecondary;
  context.beginPath();
  context.arc(720, 1180, 260, 0, Math.PI * 2);
  context.fill();
};

const drawGuides = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  plane: 'playfield' | 'raised',
): void => {
  const theme = getBoardTheme(board.themeId);
  for (const guide of board.guides) {
    if ((guide.plane ?? 'playfield') !== plane) {
      continue;
    }

    const material = getSurfaceMaterial(
      guide.material,
      board.surfaceMaterials,
    );

    context.save();
    if (plane === 'raised') {
      context.shadowColor = 'rgba(12, 18, 28, 0.24)';
      context.shadowBlur = 10;
      context.shadowOffsetY = -2;
    }

    context.strokeStyle =
      material.name === 'rubberPost'
        ? theme.guideRubberPrimary
        : theme.guideMetalPrimary;
    context.lineWidth = guide.thickness;
    context.lineCap = 'round';
    drawGuidePath(context, guide);
    context.stroke();
    context.restore();

    context.strokeStyle =
      material.name === 'rubberPost'
        ? theme.guideRubberSecondary
        : theme.guideMetalSecondary;
    if (plane === 'raised') {
      context.save();
    }
    context.lineWidth = Math.max(guide.thickness - 8, 4);
    drawGuidePath(context, guide);
    context.stroke();
    if (plane === 'raised') {
      context.restore();
    }
  }
};

const drawBumpers = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  showScoreText = false,
): void => {
  const theme = getBoardTheme(board.themeId);

  board.bumpers.forEach((bumper, index) => {
    context.fillStyle =
      theme.bumperColors[index % theme.bumperColors.length] ??
      theme.bumperColors[0];
    context.beginPath();
    context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    context.fill();

    context.lineWidth = 8;
    context.strokeStyle = theme.bumperRing;
    context.stroke();

    context.fillStyle = theme.bumperCap;
    context.beginPath();
    context.arc(bumper.x, bumper.y, bumper.radius * 0.45, 0, Math.PI * 2);
    context.fill();

    if (showScoreText) {
      context.font = `600 20px ${UI_FONT_FAMILY}`;
      context.textAlign = 'center';
      context.fillStyle = theme.bumperText;
      context.fillText(String(bumper.score), bumper.x, bumper.y + 8);
    } else {
      context.fillStyle = theme.bumperText;
      context.beginPath();
      context.arc(bumper.x, bumper.y, bumper.radius * 0.18, 0, Math.PI * 2);
      context.fill();
    }
  });

  context.textAlign = 'start';
};

const drawPosts = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  const theme = getBoardTheme(board.themeId);
  board.posts.forEach((post) => {
    const material = getSurfaceMaterial(post.material, board.surfaceMaterials);

    context.save();
    context.fillStyle =
      material.name === 'metalGuide'
        ? theme.postMetalFill
        : theme.postRubberFill;
    context.beginPath();
    context.arc(post.x, post.y, post.radius, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 5;
    context.strokeStyle =
      material.name === 'metalGuide'
        ? theme.postMetalRing
        : theme.postRubberRing;
    context.stroke();
    context.fillStyle =
      material.name === 'metalGuide'
        ? theme.postMetalCore
        : theme.postRubberCore;
    context.beginPath();
    context.arc(
      post.x,
      post.y,
      Math.max(post.radius * 0.26, 4),
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  });
};

const drawPlungerLane = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
): void => {
  const theme = getBoardTheme(board.themeId);
  const laneWidth = getPlungerLaneHalfWidth(board.plunger) * 2;
  const laneTop = getPlungerGuideTopY(board);
  const laneBottom = getPlungerGuideBottomY(board);
  const laneHeight = laneBottom - laneTop;
  const guideSegments = getPlungerGuideSegments(board);

  context.save();
  context.fillStyle = theme.plungerLaneFill;
  context.strokeStyle = theme.plungerLaneStroke;
  context.lineWidth = 3;
  context.beginPath();
  context.rect(
    board.plunger.x - laneWidth / 2,
    laneTop,
    laneWidth,
    laneHeight,
  );
  context.fill();
  context.stroke();

  context.strokeStyle = theme.plungerGuidePrimary;
  context.lineWidth = guideSegments[0].thickness;
  context.lineCap = 'round';
  for (const guide of guideSegments) {
    context.beginPath();
    context.moveTo(guide.start.x, guide.start.y);
    context.lineTo(guide.end.x, guide.end.y);
    context.stroke();
  }

  context.strokeStyle = theme.plungerGuideSecondary;
  context.lineWidth = Math.max(guideSegments[0].thickness - 4, 4);
  for (const guide of guideSegments) {
    context.beginPath();
    context.moveTo(guide.start.x, guide.start.y);
    context.lineTo(guide.end.x, guide.end.y);
    context.stroke();
  }

  context.restore();
};

const drawPlungerBody = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  const pullback = state?.plunger.pullback ?? 0;

  context.save();
  drawOrientedPlate(
    context,
    {
      x: board.plunger.x,
      y: board.plunger.y + pullback,
    },
    board.plunger.thickness,
    board.plunger.length,
    Math.PI / 2,
    theme.plungerBodyFill,
    theme.plungerBodyStroke,
  );

  context.fillStyle = theme.plungerKnob;
  context.beginPath();
  context.arc(
    board.plunger.x,
    board.plunger.y -
      board.plunger.length / 2 -
      board.plunger.thickness / 2 +
      pullback,
    board.plunger.thickness * 0.32,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
};

const drawStandupTargets = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  board.standupTargets.forEach((target, index) => {
    const lit = Boolean(
      state && state.standupTargets[index]?.cooldownSeconds > 0,
    );
    drawOrientedPlate(
      context,
      target,
      target.width,
      target.height,
      target.angle,
      lit ? theme.standupLitFill : theme.standupFill,
      theme.targetStroke,
    );
  });
};

const drawDropTargets = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  board.dropTargets.forEach((target, index) => {
    const isDown = Boolean(state?.dropTargets[index]?.isDown);
    const yOffset = isDown ? target.height * 0.6 : 0;

    drawOrientedPlate(
      context,
      { x: target.x, y: target.y + yOffset },
      target.width,
      target.height,
      target.angle,
      isDown ? theme.dropDownFill : theme.dropUpFill,
      theme.dropStroke,
    );
  });
};

const drawSaucers = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  board.saucers.forEach((saucer, index) => {
    const occupied = Boolean(state?.saucers[index]?.occupied);

    context.save();
    context.fillStyle = occupied ? theme.saucerOccupiedFill : theme.saucerFill;
    context.beginPath();
    context.arc(saucer.x, saucer.y, saucer.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = occupied ? theme.saucerCoreOccupied : theme.saucerCore;
    context.beginPath();
    context.arc(saucer.x, saucer.y, saucer.radius * 0.62, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = theme.saucerRing;
    context.lineWidth = 5;
    context.stroke();
    context.restore();
  });
};

const drawSlingshots = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);

  board.slingshots.forEach((slingshot, index) => {
    const compression = state?.slingshots[index]?.compression ?? 0;
    const bodyDepth = slingshot.height * (1.65 - compression * 0.34);
    const renderAngle = getRenderedSlingshotAngle(board, slingshot);
    const postRadius = Math.max(8, slingshot.height * 0.28);

    context.save();
    context.translate(slingshot.x, slingshot.y);
    context.rotate(renderAngle);
    traceSlingshotPath(context, slingshot.width, bodyDepth);
    context.fillStyle = theme.guideMetalPrimary;
    context.fill();

    context.lineWidth = 4;
    context.strokeStyle = theme.guideMetalSecondary;
    context.stroke();

    context.beginPath();
    context.moveTo(-slingshot.width / 2, 0);
    context.lineTo(slingshot.width / 2, 0);
    context.lineWidth = Math.max(7, slingshot.height * 0.32);
    context.lineCap = 'round';
    context.strokeStyle = theme.guideRubberPrimary;
    context.stroke();

    context.beginPath();
    context.moveTo(-slingshot.width / 2 + 2, 0);
    context.lineTo(slingshot.width / 2 - 2, 0);
    context.lineWidth = Math.max(3, slingshot.height * 0.14);
    context.strokeStyle = theme.guideRubberSecondary;
    context.stroke();

    context.fillStyle = theme.postRubberFill;
    context.strokeStyle = theme.postRubberRing;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(-slingshot.width / 2, 0, postRadius, 0, Math.PI * 2);
    context.arc(slingshot.width / 2, 0, postRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = theme.postRubberCore;
    context.beginPath();
    context.arc(-slingshot.width / 2, 0, postRadius * 0.42, 0, Math.PI * 2);
    context.arc(slingshot.width / 2, 0, postRadius * 0.42, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.moveTo(-slingshot.width * 0.28, bodyDepth * 0.56);
    context.lineTo(0, bodyDepth * 0.86);
    context.lineTo(slingshot.width * 0.28, bodyDepth * 0.56);
    context.lineWidth = 3;
    context.strokeStyle = theme.guideMetalSecondary;
    context.stroke();
    context.restore();
  });
};

const drawSpinners = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  board.spinners.forEach((spinner, index) => {
    const angle = spinner.angle + (state?.spinners[index]?.angle ?? 0);

    drawOrientedPlate(
      context,
      spinner,
      spinner.length,
      spinner.thickness,
      angle,
      theme.spinnerFill,
      theme.spinnerStroke,
    );

    context.save();
    context.fillStyle = theme.spinnerCap;
    context.beginPath();
    context.arc(
      spinner.x,
      spinner.y,
      spinner.thickness * 0.8,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  });
};

const drawRollovers = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  state?: GameState,
): void => {
  const theme = getBoardTheme(board.themeId);
  board.rollovers.forEach((rollover, index) => {
    const lit = Boolean(state?.rollovers[index]?.lit);

    context.save();
    context.fillStyle = lit ? theme.rolloverLitFill : theme.rolloverFill;
    context.beginPath();
    context.arc(rollover.x, rollover.y, rollover.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = lit
      ? theme.rolloverStrokeLit
      : theme.rolloverStroke;
    context.lineWidth = 4;
    context.stroke();
    context.restore();
  });
};

const drawFlipper = (
  context: CanvasRenderingContext2D,
  board: BoardDefinition,
  flipper: FlipperDefinition,
  angle: number,
): void => {
  const theme = getBoardTheme(board.themeId);
  const baseRadius = getFlipperBaseRadius(flipper);
  const tipRadius = getFlipperTipRadius(flipper);

  context.save();
  context.translate(flipper.x, flipper.y);
  context.rotate(angle);
  context.fillStyle = theme.flipperFill;
  traceFlipperPath(context, flipper);
  context.fill();

  context.strokeStyle = theme.flipperStroke;
  context.lineWidth = 4;
  context.stroke();

  context.fillStyle = theme.flipperCore;
  context.beginPath();
  context.arc(baseRadius * 0.6, 0, baseRadius * 0.32, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(
    flipper.length - tipRadius * 0.35,
    0,
    tipRadius * 0.2,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
};

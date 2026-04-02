import type { EditorSelection } from '../editor/editor-types';
import { EDITOR_GRID_SIZE } from '../editor/grid';
import {
  getGuideHandles,
  getOrientedRotateHandle,
} from '../editor/table-editor';
import {
  getFlipperBaseRadius,
  getFlipperTipRadius,
} from '../game/flipper-geometry';
import { isArcGuide } from '../game/guide-geometry';
import { getSurfaceMaterial } from '../game/materials';
import {
  getPlungerGuideBottomY,
  getPlungerGuideSegments,
  getPlungerGuideTopY,
  getPlungerLaneHalfWidth,
} from '../game/plunger-geometry';
import type { GameState } from '../game/game-state';
import { getStatusLabel } from '../game/game-loop';
import { getPlungerPullRatio } from '../game/physics-engine';
import { getBoardTheme } from './board-themes';
import type {
  BoardDefinition,
  BumperDefinition,
  FlipperDefinition,
  GuideDefinition,
  PostDefinition,
} from '../types/board-definition';
import type { InputState } from '../input/keyboard-input';
const EDITOR_INK = '#22304a';
const UI_FONT_FAMILY = "'Avenir Next', Avenir, Futura, 'Trebuchet MS', sans-serif";

interface EditorRenderOptions {
  showGrid?: boolean;
  snapToGrid?: boolean;
}

export class CanvasRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  renderGame(
    board: BoardDefinition,
    state: GameState,
    input: InputState,
  ): void {
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);
    context.fillStyle = getBoardTheme(board.themeId).backgroundMid;
    context.fillRect(0, 0, board.width, board.height);

    context.save();
    context.translate(state.tableNudge.offset.x, state.tableNudge.offset.y);
    this.drawBoard(context, board, state);
    context.restore();
    this.drawBall(context, board, state);
    this.drawHud(context, board, state, input);
  }

  renderEditor(
    board: BoardDefinition,
    selection: EditorSelection,
    draftPosition: { x: number; y: number } | null,
    options: EditorRenderOptions = {},
  ): void {
    const context = this.canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is unavailable.');
    }

    this.syncCanvasSize(board);
    context.clearRect(0, 0, board.width, board.height);

    this.drawBoard(context, board);
    if (options.showGrid) {
      this.drawEditorGrid(context, board);
    }
    this.drawLaunchPosition(context, board, selection);
    this.drawEditorSelection(context, board, selection);
    this.drawDraft(context, draftPosition);
    this.drawEditorHud(context, board, options);
  }

  private syncCanvasSize(board: BoardDefinition): void {
    this.canvas.width = board.width;
    this.canvas.height = board.height;
  }

  private drawBoard(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    this.drawBackground(context, board);
    this.drawGuides(context, board);
    this.drawPlunger(context, board, state);
    this.drawPosts(context, board);
    this.drawBumpers(context, board, state);
    this.drawStandupTargets(context, board, state);
    this.drawDropTargets(context, board, state);
    this.drawSaucers(context, board, state);
    this.drawSpinners(context, board, state);
    this.drawRollovers(context, board, state);

    for (const [index, flipper] of board.flippers.entries()) {
      this.drawFlipper(
        context,
        board,
        flipper,
        state
          ? getRenderedFlipperAngle(state, flipper, index)
          : flipper.restingAngle,
      );
    }
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
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
  }

  private drawGuides(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    const theme = getBoardTheme(board.themeId);
    for (const guide of board.guides) {
      const material = getSurfaceMaterial(
        guide.material,
        board.surfaceMaterials,
      );

      context.strokeStyle =
        material.name === 'rubberPost'
          ? theme.guideRubberPrimary
          : theme.guideMetalPrimary;
      context.lineWidth = guide.thickness;
      context.lineCap = 'round';
      if (isArcGuide(guide)) {
        this.traceArcGuide(context, guide);
      } else {
        context.beginPath();
        context.moveTo(guide.start.x, guide.start.y);
        context.lineTo(guide.end.x, guide.end.y);
      }
      context.stroke();

      context.strokeStyle =
        material.name === 'rubberPost'
          ? theme.guideRubberSecondary
          : theme.guideMetalSecondary;
      context.lineWidth = Math.max(guide.thickness - 8, 4);
      if (isArcGuide(guide)) {
        this.traceArcGuide(context, guide);
      } else {
        context.beginPath();
        context.moveTo(guide.start.x, guide.start.y);
        context.lineTo(guide.end.x, guide.end.y);
      }
      context.stroke();
    }
  }

  private drawBumpers(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
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

      if (state) {
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
  }

  private drawPosts(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
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
  }

  private drawPlunger(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    const pullback = state?.plunger.pullback ?? 0;
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

    this.drawOrientedPlate(
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
  }

  private drawStandupTargets(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    board.standupTargets.forEach((target, index) => {
      const lit = Boolean(
        state && state.standupTargets[index]?.cooldownSeconds > 0,
      );
      this.drawOrientedPlate(
        context,
        target,
        target.width,
        target.height,
        target.angle,
        lit ? theme.standupLitFill : theme.standupFill,
        theme.targetStroke,
      );
    });
  }

  private drawDropTargets(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    board.dropTargets.forEach((target, index) => {
      const isDown = Boolean(state?.dropTargets[index]?.isDown);
      const yOffset = isDown ? target.height * 0.6 : 0;

      this.drawOrientedPlate(
        context,
        { x: target.x, y: target.y + yOffset },
        target.width,
        target.height,
        target.angle,
        isDown ? theme.dropDownFill : theme.dropUpFill,
        theme.dropStroke,
      );
    });
  }

  private drawSaucers(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
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
  }

  private drawSpinners(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    board.spinners.forEach((spinner, index) => {
      const angle = spinner.angle + (state?.spinners[index]?.angle ?? 0);

      this.drawOrientedPlate(
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
  }

  private drawRollovers(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state?: GameState,
  ): void {
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
  }

  private drawFlipper(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    flipper: FlipperDefinition,
    angle: number,
  ): void {
    const theme = getBoardTheme(board.themeId);
    const baseRadius = getFlipperBaseRadius(flipper);
    const tipRadius = getFlipperTipRadius(flipper);

    context.save();
    context.translate(flipper.x, flipper.y);
    context.rotate(angle);
    context.fillStyle = theme.flipperFill;
    this.traceFlipperPath(context, flipper);
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
  }

  private drawBall(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    context.fillStyle = theme.ballFill;
    context.beginPath();
    context.arc(
      state.ball.position.x,
      state.ball.position.y,
      state.ball.radius,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.strokeStyle = theme.ballStroke;
    context.lineWidth = 2;
    context.stroke();
  }

  private drawHud(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
    input: InputState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    context.fillStyle = theme.hudText;
    context.font = `600 28px ${UI_FONT_FAMILY}`;
    context.fillText(board.name, 48, 64);
    context.fillText(`Score ${state.score}`, 48, 104);

    if (state.status === 'waiting-launch') {
      this.drawLaunchMeter(context, board, state);
    }

    context.font = `400 20px ${UI_FONT_FAMILY}`;
    context.fillStyle = theme.hudMuted;
    context.fillText(
      getStatusLabel(state, input, board),
      48,
      board.height - 44,
    );
  }

  private drawLaunchMeter(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    state: GameState,
  ): void {
    const theme = getBoardTheme(board.themeId);
    const ratio = getPlungerPullRatio(state, board);
    const meterWidth = 200;
    const meterHeight = 14;
    const x = board.width - meterWidth - 48;
    const y = 54;

    context.fillStyle = theme.launchMeterTrack;
    context.fillRect(x, y, meterWidth, meterHeight);

    context.fillStyle = theme.launchMeterFill;
    context.fillRect(x, y, meterWidth * ratio, meterHeight);

    context.strokeStyle = theme.launchMeterStroke;
    context.lineWidth = 2;
    context.strokeRect(x, y, meterWidth, meterHeight);

    context.font = `400 16px ${UI_FONT_FAMILY}`;
    context.fillStyle = theme.hudText;
    context.fillText('Plunger', x, y - 10);
  }

  private drawLaunchPosition(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    selection: EditorSelection,
  ): void {
    const theme = getBoardTheme(board.themeId);
    context.save();
    context.strokeStyle =
      selection.kind === 'launch-position'
        ? theme.launchMarkerStrokeActive
        : theme.launchMarkerStroke;
    context.fillStyle = theme.launchMarkerFill;
    context.lineWidth = selection.kind === 'launch-position' ? 4 : 2;
    context.beginPath();
    context.arc(
      board.launchPosition.x,
      board.launchPosition.y,
      26,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(board.launchPosition.x - 14, board.launchPosition.y);
    context.lineTo(board.launchPosition.x + 14, board.launchPosition.y);
    context.moveTo(board.launchPosition.x, board.launchPosition.y - 14);
    context.lineTo(board.launchPosition.x, board.launchPosition.y + 14);
    context.stroke();
    context.restore();
  }

  private drawEditorSelection(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    selection: EditorSelection,
  ): void {
    if (selection.kind === 'bumper' && selection.index !== undefined) {
      const bumper = board.bumpers[selection.index];

      if (bumper) {
        this.drawBumperSelection(context, bumper);
      }
    }

    if (selection.kind === 'post' && selection.index !== undefined) {
      const post = board.posts[selection.index];

      if (post) {
        this.drawPostSelection(context, post);
      }
    }

    if (selection.kind === 'guide' && selection.index !== undefined) {
      const guide = board.guides[selection.index];

      if (guide) {
        this.drawGuideSelection(context, guide);
      }
    }

    if (selection.kind === 'flipper' && selection.index !== undefined) {
      const flipper = board.flippers[selection.index];

      if (flipper) {
        this.drawFlipperSelection(context, flipper);
      }
    }

    if (selection.kind === 'standup-target' && selection.index !== undefined) {
      const target = board.standupTargets[selection.index];

      if (target) {
        this.drawOrientedSelection(
          context,
          target,
          target.width,
          target.height,
          target.angle,
        );
      }
    }

    if (selection.kind === 'drop-target' && selection.index !== undefined) {
      const target = board.dropTargets[selection.index];

      if (target) {
        this.drawOrientedSelection(
          context,
          target,
          target.width,
          target.height,
          target.angle,
        );
      }
    }

    if (selection.kind === 'saucer' && selection.index !== undefined) {
      const saucer = board.saucers[selection.index];

      if (saucer) {
        this.drawCircularSelection(context, saucer, saucer.radius);
      }
    }

    if (selection.kind === 'spinner' && selection.index !== undefined) {
      const spinner = board.spinners[selection.index];

      if (spinner) {
        this.drawOrientedSelection(
          context,
          spinner,
          spinner.length,
          spinner.thickness,
          spinner.angle,
        );
      }
    }

    if (selection.kind === 'rollover' && selection.index !== undefined) {
      const rollover = board.rollovers[selection.index];

      if (rollover) {
        this.drawCircularSelection(context, rollover, rollover.radius);
      }
    }

    if (selection.kind === 'launch-position') {
      this.drawOrientedSelection(
        context,
        board.plunger,
        board.plunger.length,
        board.plunger.thickness,
        Math.PI / 2,
      );
      for (const guide of getPlungerGuideSegments(board)) {
        this.drawLineSelection(context, guide.start, guide.end, guide.thickness);
      }
    }
  }

  private drawBumperSelection(
    context: CanvasRenderingContext2D,
    bumper: BumperDefinition,
  ): void {
    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.arc(bumper.x, bumper.y, bumper.radius + 10, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawPostSelection(
    context: CanvasRenderingContext2D,
    post: PostDefinition,
  ): void {
    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.arc(post.x, post.y, post.radius + 10, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawGuideSelection(
    context: CanvasRenderingContext2D,
    guide: GuideDefinition,
  ): void {
    if (isArcGuide(guide)) {
      const handles = getGuideHandles(guide);

      context.save();
      context.strokeStyle = '#ffd166';
      context.lineWidth = guide.thickness + 10;
      context.globalAlpha = 0.45;
      this.traceArcGuide(context, guide);
      context.stroke();
      context.globalAlpha = 1;
      context.setLineDash([10, 6]);
      context.lineWidth = 4;
      this.traceArcGuide(context, guide);
      context.stroke();
      if (handles) {
        context.setLineDash([]);
        this.drawEditorHandle(context, handles.start, '#ffd166');
        this.drawEditorHandle(context, handles.end, '#ffd166');
        this.drawEditorHandle(context, handles.rotate, '#70d1f4');
      }
      context.restore();
      return;
    }

    const handles = getGuideHandles(guide);
    if (!handles) {
      return;
    }
    const midpoint = {
      x: (guide.start.x + guide.end.x) / 2,
      y: (guide.start.y + guide.end.y) / 2,
    };

    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = guide.thickness + 10;
    context.lineCap = 'round';
    context.globalAlpha = 0.45;
    context.beginPath();
    context.moveTo(guide.start.x, guide.start.y);
    context.lineTo(guide.end.x, guide.end.y);
    context.stroke();

    context.globalAlpha = 1;
    context.setLineDash([10, 6]);
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(guide.start.x, guide.start.y);
    context.lineTo(guide.end.x, guide.end.y);
    context.stroke();

    context.setLineDash([]);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(midpoint.x, midpoint.y);
    context.lineTo(handles.rotate.x, handles.rotate.y);
    context.stroke();

    this.drawEditorHandle(context, handles.start, '#ffd166');
    this.drawEditorHandle(context, handles.end, '#ffd166');
    this.drawEditorHandle(context, handles.rotate, '#70d1f4');
    context.restore();
  }

  private drawLineSelection(
    context: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
    thickness: number,
  ): void {
    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = thickness + 10;
    context.lineCap = 'round';
    context.globalAlpha = 0.45;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.globalAlpha = 1;
    context.setLineDash([10, 6]);
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.restore();
  }

  private drawFlipperSelection(
    context: CanvasRenderingContext2D,
    flipper: FlipperDefinition,
  ): void {
    context.save();
    context.translate(flipper.x, flipper.y);
    context.rotate(flipper.restingAngle);
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    this.traceFlipperPath(context, flipper);
    context.stroke();
    context.restore();
  }

  private traceFlipperPath(
    context: CanvasRenderingContext2D,
    flipper: FlipperDefinition,
  ): void {
    const baseRadius = getFlipperBaseRadius(flipper);
    const tipRadius = getFlipperTipRadius(flipper);

    context.beginPath();
    context.moveTo(0, -baseRadius);
    context.lineTo(flipper.length, -tipRadius);
    context.arc(flipper.length, 0, tipRadius, -Math.PI / 2, Math.PI / 2);
    context.lineTo(0, baseRadius);
    context.arc(0, 0, baseRadius, Math.PI / 2, -Math.PI / 2);
    context.closePath();
  }

  private traceArcGuide(
    context: CanvasRenderingContext2D,
    guide: Extract<GuideDefinition, { kind: 'arc' }>,
  ): void {
    const start = guide.startAngle;
    let end = guide.endAngle;

    while (end <= start) {
      end += Math.PI * 2;
    }

    context.beginPath();
    context.arc(guide.center.x, guide.center.y, guide.radius, start, end);
  }

  private drawCircularSelection(
    context: CanvasRenderingContext2D,
    center: { x: number; y: number },
    radius: number,
  ): void {
    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.arc(center.x, center.y, radius + 10, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawOrientedSelection(
    context: CanvasRenderingContext2D,
    element: { x: number; y: number },
    width: number,
    height: number,
    angle: number,
  ): void {
    const handle = getOrientedRotateHandle(element, height, angle);

    context.save();
    context.translate(element.x, element.y);
    context.rotate(angle);
    context.strokeStyle = '#ffd166';
    context.lineWidth = 4;
    context.setLineDash([10, 6]);
    context.strokeRect(
      -width / 2 - 8,
      -height / 2 - 8,
      width + 16,
      height + 16,
    );
    context.restore();

    context.save();
    context.strokeStyle = '#ffd166';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(element.x, element.y);
    context.lineTo(handle.x, handle.y);
    context.stroke();
    this.drawEditorHandle(context, handle, '#70d1f4');
    context.restore();
  }

  private drawDraft(
    context: CanvasRenderingContext2D,
    draftPosition: { x: number; y: number } | null,
  ): void {
    if (!draftPosition) {
      return;
    }

    context.save();
    context.strokeStyle = 'rgba(255, 209, 102, 0.85)';
    context.lineWidth = 2;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.arc(draftPosition.x, draftPosition.y, 40, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  private drawEditorGrid(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
  ): void {
    context.save();

    for (let x = 0; x <= board.width; x += EDITOR_GRID_SIZE) {
      const isMajor = x % (EDITOR_GRID_SIZE * 5) === 0;
      context.strokeStyle = isMajor
        ? 'rgba(34, 48, 74, 0.22)'
        : 'rgba(34, 48, 74, 0.1)';
      context.lineWidth = isMajor ? 1.4 : 1;
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, board.height);
      context.stroke();
    }

    for (let y = 0; y <= board.height; y += EDITOR_GRID_SIZE) {
      const isMajor = y % (EDITOR_GRID_SIZE * 5) === 0;
      context.strokeStyle = isMajor
        ? 'rgba(34, 48, 74, 0.22)'
        : 'rgba(34, 48, 74, 0.1)';
      context.lineWidth = isMajor ? 1.4 : 1;
      context.beginPath();
      context.moveTo(0, y + 0.5);
      context.lineTo(board.width, y + 0.5);
      context.stroke();
    }

    context.restore();
  }

  private drawEditorHud(
    context: CanvasRenderingContext2D,
    board: BoardDefinition,
    options: EditorRenderOptions,
  ): void {
    const theme = getBoardTheme(board.themeId);
    context.fillStyle = theme.hudText;
    context.font = `600 28px ${UI_FONT_FAMILY}`;
    context.fillText(`${board.name} Editor`, 48, 64);
    context.font = `400 18px ${UI_FONT_FAMILY}`;
    context.fillStyle = theme.hudMuted;
    context.fillText(
      'Drag elements to reposition. Delete removes the selection.',
      48,
      96,
    );
    context.fillText(
      'Play Test runs the current saved layout through the same physics loop.',
      48,
      122,
    );
    if (options.showGrid) {
      context.fillText(
        `Grid ${EDITOR_GRID_SIZE}px · Snap ${options.snapToGrid ? 'On' : 'Off'}`,
        48,
        148,
      );
    }
  }

  private drawEditorHandle(
    context: CanvasRenderingContext2D,
    point: { x: number; y: number },
    color: string,
  ): void {
    context.fillStyle = color;
    context.strokeStyle = EDITOR_INK;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(point.x, point.y, 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  private drawOrientedPlate(
    context: CanvasRenderingContext2D,
    element: { x: number; y: number },
    width: number,
    height: number,
    angle: number,
    fill: string,
    stroke: string,
  ): void {
    context.save();
    context.translate(element.x, element.y);
    context.rotate(angle);
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(-width / 2, -height / 2, width, height, height / 2);
    context.fill();
    context.stroke();
    context.restore();
  }
}

const getRenderedFlipperAngle = (
  state: GameState,
  flipper: FlipperDefinition,
  index: number,
): number => state.flippers[index]?.angle ?? flipper.restingAngle;

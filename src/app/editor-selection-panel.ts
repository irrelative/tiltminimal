import { isArcGuide } from '../game/guide-geometry';
import type { BoardDefinition } from '../types/board-definition';
import type { EditorSelection } from '../editor/editor-types';

interface RenderSelectionPanelOptions {
  board: BoardDefinition;
  selection: EditorSelection;
  selectionLabel: HTMLElement;
  selectionFields: HTMLElement;
  deleteSelectionButton: HTMLButtonElement;
}

export const renderSelectionPanel = ({
  board,
  selection,
  selectionLabel,
  selectionFields,
  deleteSelectionButton,
}: RenderSelectionPanelOptions): void => {
  if (selection.kind === 'none') {
    selectionLabel.textContent = 'Nothing selected.';
    deleteSelectionButton.disabled = true;
    selectionFields.replaceChildren();
    return;
  }

  deleteSelectionButton.disabled = selection.kind === 'launch-position';
  selectionFields.replaceChildren();

  if (selection.kind === 'launch-position') {
    selectionLabel.textContent = 'Launcher';
    selectionFields.append(
      createNumericField('x', 'Ball X', board.launchPosition.x),
      createNumericField('y', 'Ball Y', board.launchPosition.y),
      createNumericField('length', 'Length', board.plunger.length),
      createNumericField('thickness', 'Thickness', board.plunger.thickness),
      createNumericField('travel', 'Travel', board.plunger.travel),
      createNumericField('guideLength', 'Guide Length', board.plunger.guideLength),
    );
    return;
  }

  if (selection.kind === 'bumper' && selection.index !== undefined) {
    const bumper = board.bumpers[selection.index];

    if (!bumper) {
      return;
    }

    selectionLabel.textContent = `Bumper ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', bumper.x),
      createNumericField('y', 'Y', bumper.y),
      createNumericField('radius', 'Radius', bumper.radius),
      createNumericField('score', 'Score', bumper.score),
    );
    return;
  }

  if (selection.kind === 'post' && selection.index !== undefined) {
    const post = board.posts[selection.index];

    if (!post) {
      return;
    }

    selectionLabel.textContent = `Post ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', post.x),
      createNumericField('y', 'Y', post.y),
      createNumericField('radius', 'Radius', post.radius),
    );
    return;
  }

  if (selection.kind === 'standup-target' && selection.index !== undefined) {
    const target = board.standupTargets[selection.index];

    if (!target) {
      return;
    }

    selectionLabel.textContent = `Standup target ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', target.x),
      createNumericField('y', 'Y', target.y),
      createNumericField('width', 'Width', target.width),
      createNumericField('height', 'Height', target.height),
      createNumericField('angle', 'Angle', radiansToDegrees(target.angle)),
      createNumericField('score', 'Score', target.score),
    );
    return;
  }

  if (selection.kind === 'drop-target' && selection.index !== undefined) {
    const target = board.dropTargets[selection.index];

    if (!target) {
      return;
    }

    selectionLabel.textContent = `Drop target ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', target.x),
      createNumericField('y', 'Y', target.y),
      createNumericField('width', 'Width', target.width),
      createNumericField('height', 'Height', target.height),
      createNumericField('angle', 'Angle', radiansToDegrees(target.angle)),
      createNumericField('score', 'Score', target.score),
    );
    return;
  }

  if (selection.kind === 'saucer' && selection.index !== undefined) {
    const saucer = board.saucers[selection.index];

    if (!saucer) {
      return;
    }

    selectionLabel.textContent = `Saucer ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', saucer.x),
      createNumericField('y', 'Y', saucer.y),
      createNumericField('radius', 'Radius', saucer.radius),
      createNumericField('score', 'Score', saucer.score),
      createNumericField('holdSeconds', 'Hold (s)', saucer.holdSeconds, 0.05),
      createNumericField('ejectSpeed', 'Eject speed', saucer.ejectSpeed),
      createNumericField(
        'ejectAngle',
        'Eject angle',
        radiansToDegrees(saucer.ejectAngle),
      ),
    );
    return;
  }

  if (selection.kind === 'spinner' && selection.index !== undefined) {
    const spinner = board.spinners[selection.index];

    if (!spinner) {
      return;
    }

    selectionLabel.textContent = `Spinner ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', spinner.x),
      createNumericField('y', 'Y', spinner.y),
      createNumericField('length', 'Length', spinner.length),
      createNumericField('thickness', 'Thickness', spinner.thickness),
      createNumericField('angle', 'Angle', radiansToDegrees(spinner.angle)),
      createNumericField('score', 'Score', spinner.score),
    );
    return;
  }

  if (selection.kind === 'slingshot' && selection.index !== undefined) {
    const slingshot = board.slingshots[selection.index];

    if (!slingshot) {
      return;
    }

    selectionLabel.textContent = `Slingshot ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', slingshot.x),
      createNumericField('y', 'Y', slingshot.y),
      createNumericField('width', 'Width', slingshot.width),
      createNumericField('height', 'Height', slingshot.height),
      createNumericField('angle', 'Angle', radiansToDegrees(slingshot.angle)),
      createNumericField('score', 'Score', slingshot.score),
      createNumericField('strength', 'Strength', slingshot.strength),
    );
    return;
  }

  if (selection.kind === 'rollover' && selection.index !== undefined) {
    const rollover = board.rollovers[selection.index];

    if (!rollover) {
      return;
    }

    selectionLabel.textContent = `Rollover ${selection.index + 1}`;
    selectionFields.append(
      createNumericField('x', 'X', rollover.x),
      createNumericField('y', 'Y', rollover.y),
      createNumericField('radius', 'Radius', rollover.radius),
      createNumericField('score', 'Score', rollover.score),
    );
    return;
  }

  if (selection.kind === 'guide' && selection.index !== undefined) {
    const guide = board.guides[selection.index];

    if (!guide) {
      return;
    }

    selectionLabel.textContent = isArcGuide(guide)
      ? `Curved guide ${selection.index + 1}`
      : `Guide ${selection.index + 1}`;

    if (isArcGuide(guide)) {
      selectionFields.append(
        createNumericField('centerX', 'Center X', guide.center.x),
        createNumericField('centerY', 'Center Y', guide.center.y),
        createNumericField('radius', 'Radius', guide.radius),
        createNumericField(
          'startAngle',
          'Start Angle',
          radiansToDegrees(guide.startAngle),
        ),
        createNumericField(
          'endAngle',
          'End Angle',
          radiansToDegrees(guide.endAngle),
        ),
        createNumericField('thickness', 'Thickness', guide.thickness),
        createSelectField('plane', 'Plane', guide.plane ?? 'playfield', [
          { value: 'playfield', label: 'Playfield' },
          { value: 'raised', label: 'Raised' },
        ]),
      );
    } else {
      selectionFields.append(
        createNumericField('startX', 'Start X', guide.start.x),
        createNumericField('startY', 'Start Y', guide.start.y),
        createNumericField('endX', 'End X', guide.end.x),
        createNumericField('endY', 'End Y', guide.end.y),
        createNumericField('thickness', 'Thickness', guide.thickness),
        createSelectField('plane', 'Plane', guide.plane ?? 'playfield', [
          { value: 'playfield', label: 'Playfield' },
          { value: 'raised', label: 'Raised' },
        ]),
      );
    }
    return;
  }

  if (selection.kind === 'flipper' && selection.index !== undefined) {
    const flipper = board.flippers[selection.index];

    if (!flipper) {
      return;
    }

    selectionLabel.textContent = `${capitalize(flipper.side)} flipper ${selection.index + 1}`;
    selectionFields.append(
      createReadOnlyField('Side', capitalize(flipper.side)),
      createNumericField('x', 'Pivot X', flipper.x),
      createNumericField('y', 'Pivot Y', flipper.y),
      createNumericField('length', 'Length', flipper.length),
      createNumericField('thickness', 'Thickness', flipper.thickness),
    );
  }
};

const createNumericField = (
  field: string,
  label: string,
  value: number,
  step = 1,
): HTMLElement => {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(step);
  input.value =
    step >= 1 ? String(Math.round(value)) : String(Number(value.toFixed(2)));
  input.dataset.field = field;
  wrapper.append(labelText, input);

  return wrapper;
};

const createReadOnlyField = (label: string, value: string): HTMLElement => {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.dataset.span = 'full';
  wrapper.dataset.type = 'readonly';
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const valueText = document.createElement('strong');
  valueText.textContent = value;
  wrapper.append(labelText, valueText);

  return wrapper;
};

const createSelectField = (
  field: string,
  label: string,
  value: string,
  options: Array<{ value: string; label: string }>,
): HTMLElement => {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';
  const labelText = document.createElement('span');
  labelText.textContent = label;
  const select = document.createElement('select');
  select.dataset.field = field;

  for (const option of options) {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    optionElement.selected = option.value === value;
    select.append(optionElement);
  }

  wrapper.append(labelText, select);
  return wrapper;
};

const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;

const radiansToDegrees = (angle: number): number => (angle * 180) / Math.PI;

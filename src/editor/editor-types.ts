export interface EditorSelection {
  kind:
    | 'post'
    | 'bumper'
    | 'standup-target'
    | 'drop-target'
    | 'saucer'
    | 'spinner'
    | 'slingshot'
    | 'rollover'
    | 'flipper'
    | 'guide'
    | 'launch-position'
    | 'none';
  index?: number;
}

export type EditorDragMode =
  | 'move-selection'
  | 'oriented-rotate'
  | 'guide-start'
  | 'guide-end'
  | 'guide-rotate'
  | 'guide-arc-start'
  | 'guide-arc-end'
  | 'guide-arc-radius';

export type EditorTool =
  | 'select'
  | 'add-post'
  | 'add-guide'
  | 'add-curved-guide'
  | 'add-bumper'
  | 'add-standup-target'
  | 'add-drop-target'
  | 'add-saucer'
  | 'add-spinner'
  | 'add-slingshot'
  | 'add-lower-playfield'
  | 'add-rollover'
  | 'add-left-flipper'
  | 'add-right-flipper';

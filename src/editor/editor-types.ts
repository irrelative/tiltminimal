export interface EditorSelection {
  kind: 'bumper' | 'flipper' | 'guide' | 'launch-position' | 'none';
  index?: number;
}

export type EditorTool =
  | 'select'
  | 'add-bumper'
  | 'add-left-flipper'
  | 'add-right-flipper';

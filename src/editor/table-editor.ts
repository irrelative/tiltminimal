export {
  addBumper,
  addCurvedGuide,
  addDropTarget,
  addFlipper,
  addGuide,
  addLowerPlayfield,
  addPost,
  addRollover,
  addSaucer,
  addSlingshot,
  addSpinner,
  addStandupTarget,
} from './table-editor-add';
export {
  getGuideHandles,
  getOrientedRotateHandle,
  hitTestGuideHandle,
  hitTestOrientedRotateHandle,
  moveGuideHandle,
  rotateSelection,
} from './table-editor-handles';
export {
  deleteSelection,
  moveSelection,
  updateSelectedGuidePlane,
  updateSelectedNumericField,
} from './table-editor-mutate';
export { hitTestSelection } from './table-editor-selection';
export { getPostSelectionPadding } from './table-editor-shared';

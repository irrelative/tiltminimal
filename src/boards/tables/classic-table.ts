import { compileBuiltInBoardLayout } from '../layout-compiler';
import { classicTableLayout } from './classic-layout';

export const classicTable = compileBuiltInBoardLayout(classicTableLayout);

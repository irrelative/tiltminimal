import { compileBuiltInBoardLayout } from '../layout-compiler';
import { starlightEmLayout } from './starlight-em-layout';

export const starlightEmTable = compileBuiltInBoardLayout(starlightEmLayout);

import { BUILT_IN_TABLES } from '../boards/table-library';
import { TABLE_RULE_CARDS } from '../boards/table-rule-cards';
import { drawBoard } from '../render/canvas-renderer-board';
import { buildAppRoutePath, getAppRouteFromPathname } from './routes';

export const renderTableSelection = (
  host: HTMLElement,
  href: string,
  basePath: string,
): void => {
  const location = new URL(href);
  const route = getAppRouteFromPathname(location.pathname, basePath);
  host.replaceChildren(
    ...BUILT_IN_TABLES.map((table) => {
      const link = document.createElement('a');
      link.className = 'table-choice';
      const url = new URL(buildAppRoutePath(route, basePath), location);
      url.searchParams.set('table', table.id);
      link.href = url.href;
      link.setAttribute('aria-label', `Play ${table.board.name}`);
      const preview = document.createElement('canvas');
      preview.width = table.board.width;
      preview.height = table.board.height;
      preview.className = 'table-preview';
      preview.setAttribute('aria-hidden', 'true');
      const context = preview.getContext('2d');
      if (context) drawBoard(context, table.board);
      const body = document.createElement('div');
      body.className = 'table-choice-copy';
      const meta = document.createElement('p');
      meta.className = 'eyebrow';
      meta.textContent = `${TABLE_RULE_CARDS[table.id].balls} balls`;
      const title = document.createElement('h2');
      title.textContent = table.board.name;
      const description = document.createElement('p');
      description.className = 'meta-text';
      description.textContent =
        table.description ?? TABLE_RULE_CARDS[table.id].objective;
      const action = document.createElement('span');
      action.className = 'table-choice-action';
      action.textContent = 'Play table →';
      body.append(meta, title, description, action);
      link.append(preview, body);
      return link;
    }),
  );
};

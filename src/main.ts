import { createAnalyticsSender } from './app/analytics';
import { BUILT_IN_TABLES } from './boards/table-library';
import { renderTableSelection } from './app/table-selection';
import './styles.css';

const selected = new URLSearchParams(window.location.search).get('table');
if (BUILT_IN_TABLES.some((table) => table.id === selected)) {
  document.querySelector<HTMLElement>('.workspace')!.hidden = false;
  void import('./app/game-app');
} else {
  document.querySelector<HTMLElement>('#table-selection')!.hidden = false;
  renderTableSelection(
    document.querySelector<HTMLElement>('#table-grid')!,
    window.location.href,
    import.meta.env.BASE_URL,
  );
}

if (!/\/physics\/?$/.test(window.location.pathname)) {
  createAnalyticsSender()({
    type: 'view',
    tableId: BUILT_IN_TABLES.some((t) => t.id === selected)
      ? selected!
      : 'gallery',
  });
}

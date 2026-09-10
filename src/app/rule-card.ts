import type { BuiltInTable } from '../boards/table-library';
import { TABLE_RULE_CARDS } from '../boards/table-rule-cards';

export class RuleCard {
  private readonly layer = document.createElement('details');
  private readonly toggle = document.createElement('summary');
  private readonly card = document.createElement('section');
  private open = false;

  constructor(
    host: HTMLElement,
    private readonly onToggle: (open: boolean) => void,
  ) {
    this.layer.className = 'rule-card-layer';
    this.toggle.className = 'rule-card-toggle';
    this.toggle.textContent = 'Rule card';
    this.toggle.setAttribute('aria-controls', 'table-rule-card');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.card.id = 'table-rule-card';
    this.card.className = 'rule-card';
    this.card.tabIndex = 0;
    this.card.setAttribute('aria-labelledby', 'rule-card-title');
    this.card.hidden = true;
    this.layer.append(this.toggle, this.card);
    host.append(this.layer);
    this.toggle.addEventListener('click', (event) => {
      event.preventDefault();
      this.setOpen(!this.open);
    });
    this.layer.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape' && this.open) {
        this.setOpen(false);
        this.toggle.focus();
      }
    });
  }

  setTable(table: BuiltInTable): void {
    this.setOpen(false);
    const content = TABLE_RULE_CARDS[table.id];
    const title = document.createElement('h2');
    title.id = 'rule-card-title';
    title.textContent = table.board.name;
    const subtitle = document.createElement('p');
    subtitle.textContent = `${content.balls} balls · ${content.objective}`;
    const list = document.createElement('ul');
    for (const rule of content.rules) {
      const item = document.createElement('li');
      item.textContent = rule;
      list.append(item);
    }
    const footer = document.createElement('p');
    footer.className = 'rule-card-footer';
    footer.textContent = 'Play paused while this card is open.';
    this.card.replaceChildren(title, subtitle, list, footer);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    this.card.hidden = !open;
    this.layer.open = open;
    this.toggle.setAttribute('aria-expanded', String(open));
    this.onToggle(open);
  }
}

import type { BuiltInTable } from '../boards/table-library';
import { TABLE_RULE_CARDS } from '../boards/table-rule-cards';

export class RuleCard {
  private readonly layer = document.createElement('div');
  private readonly toggle = document.createElement('button');
  private readonly card = document.createElement('section');
  private open = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onToggle: (open: boolean) => void,
  ) {
    this.layer.className = 'rule-card-layer';
    this.toggle.type = 'button';
    this.toggle.className = 'rule-card-toggle';
    this.toggle.textContent = 'Rule card';
    this.toggle.setAttribute('aria-controls', 'table-rule-card');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.card.id = 'table-rule-card';
    this.card.className = 'rule-card';
    this.card.tabIndex = 0;
    this.card.setAttribute('aria-labelledby', 'rule-card-title');
    this.card.hidden = true;
    this.layer.append(this.card, this.toggle);
    canvas.parentElement!.append(this.layer);
    this.toggle.addEventListener('click', () => this.setOpen(!this.open));
    this.layer.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape' && this.open) {
        this.setOpen(false);
        this.toggle.focus();
      }
    });
    // Match the canvas, including horizontal or vertical letterboxing.
    const position = (): void => {
      this.layer.style.width = `${canvas.clientWidth}px`;
      this.layer.style.height = `${canvas.clientHeight}px`;
    };
    new ResizeObserver(position).observe(canvas);
    position();
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
    this.toggle.textContent = open ? 'Close rules' : 'Rule card';
    this.toggle.setAttribute('aria-expanded', String(open));
    this.onToggle(open);
  }
}

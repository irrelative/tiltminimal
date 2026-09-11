const form = document.querySelector('#login');
const reports = document.querySelector('#reports');
const message = document.querySelector('#message');
function section(title, columns, rows) {
  const heading = document.createElement('h2');
  heading.textContent = title;
  reports.append(heading);
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No data yet.';
    reports.append(empty);
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'scroll';
  const table = document.createElement('table'),
    head = document.createElement('thead'),
    header = document.createElement('tr');
  columns.forEach(([label]) => {
    const th = document.createElement('th');
    th.textContent = label;
    th.scope = 'col';
    header.append(th);
  });
  head.append(header);
  table.append(head);
  const body = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach(([, key]) => {
      const td = document.createElement('td');
      const value = row[key];
      td.textContent =
        key === 'ended_at'
          ? new Date(value).toISOString().slice(0, 10)
          : String(value ?? '—');
      tr.append(td);
    });
    body.append(tr);
  });
  table.append(body);
  wrapper.append(table);
  reports.append(wrapper);
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = 'Loading…';
  reports.replaceChildren();
  try {
    const response = await fetch('/api/stats', {
      headers: {
        Authorization: `Bearer ${document.querySelector('#key').value.trim()}`,
      },
      cache: 'no-store',
    });
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? 'The dashboard key was not accepted.'
          : 'Unable to load statistics. Try again shortly.',
      );
    const data = await response.json();
    const views = data.views.reduce((total, row) => total + row.views, 0),
      starts = data.games.reduce((total, row) => total + row.started, 0),
      completed = data.games.reduce((total, row) => total + row.completed, 0);
    message.textContent = `Last 30 days: ${views.toLocaleString()} views · ${starts.toLocaleString()} games started · ${completed.toLocaleString()} completed`;
    section(
      'Games by table',
      [
        ['Table', 'table_id'],
        ['Started', 'started'],
        ['Completed', 'completed'],
        ['Reset/debug', 'excluded'],
        ['Average seconds', 'average_seconds'],
      ],
      data.games,
    );
    section(
      'High scores',
      [
        ['Table', 'table_id'],
        ['Rules version', 'rules_version'],
        ['Score', 'score'],
        ['Date', 'ended_at'],
      ],
      data.scores,
    );
    section(
      'Daily views',
      [
        ['Date', 'day'],
        ['Table / page', 'table_id'],
        ['Views', 'views'],
      ],
      data.views,
    );
  } catch (error) {
    message.textContent = error.message;
  }
});

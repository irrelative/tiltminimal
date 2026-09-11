import { rulesVersionForTable } from '../app/analytics';

interface Statement {
  bind(...values: unknown[]): Statement;
  run(): Promise<unknown>;
  all(): Promise<{ results: Record<string, unknown>[] }>;
}
export interface Env {
  DB: {
    prepare(sql: string): Statement;
    batch(
      statements: Statement[],
    ): Promise<{ results: Record<string, unknown>[] }[]>;
  };
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_TOKEN: string;
  EVENT_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}
export const TABLE_IDS = [
  'classic-table',
  'andromeda',
  'double-crossed',
  'harlem-globetrotters',
  'starlight-em',
  'switchyard',
  'just-one-more',
];
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
export function validEvent(e: Record<string, unknown>): boolean {
  if (typeof e.tableId !== 'string') return false;
  if (e.type === 'view')
    return e.tableId === 'gallery' || TABLE_IDS.includes(e.tableId);
  if (!TABLE_IDS.includes(e.tableId) || !uuid(e.gameId)) return false;
  if (e.type === 'start') return e.version === rulesVersionForTable(e.tableId);
  if (e.type === 'exclude') return true;
  return (
    e.type === 'finish' &&
    Number.isSafeInteger(e.score) &&
    Number(e.score) >= 0 &&
    Number(e.score) <= 1e12 &&
    Number.isSafeInteger(e.durationMs) &&
    Number(e.durationMs) >= 0 &&
    Number(e.durationMs) <= 86400000
  );
}
async function authorized(request: Request, token: string) {
  if (!token || token.length < 32) return false;
  const incoming = request.headers.get('Authorization') ?? '';
  const hash = async (s: string) =>
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    );
  const [a, b] = await Promise.all([hash(incoming), hash(`Bearer ${token}`)]);
  return (
    a.reduce((difference, value, i) => difference | (value ^ b[i]), 0) === 0
  );
}
async function stats(env: Env) {
  const since = Date.now() - 30 * 86400000;
  const reports = await env.DB.batch([
    env.DB.prepare(
      'SELECT day, table_id, views FROM page_views WHERE day >= ? ORDER BY day DESC, table_id',
    ).bind(new Date(since).toISOString().slice(0, 10)),
    env.DB.prepare(
      `SELECT table_id, COUNT(*) AS started, SUM(ended_at IS NOT NULL AND excluded=0) AS completed,
      SUM(excluded) AS excluded, ROUND(AVG(CASE WHEN ended_at IS NOT NULL AND excluded=0 THEN duration_ms END)/1000) AS average_seconds
      FROM games WHERE started_at >= ? GROUP BY table_id`,
    ).bind(since),
    env.DB.prepare(`SELECT table_id, rules_version, score, ended_at FROM (
      SELECT table_id, rules_version, score, ended_at,
      ROW_NUMBER() OVER (PARTITION BY table_id, rules_version ORDER BY score DESC, ended_at ASC) AS rank
      FROM games WHERE ended_at IS NOT NULL AND excluded=0 AND score>0
    ) WHERE rank<=5 ORDER BY table_id, rules_version DESC, score DESC`),
  ]);
  return json({
    views: reports[0].results,
    games: reports[1].results,
    scores: reports[2].results,
    days: 30,
  });
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/stats') {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Robots-Tag', 'noindex');
      return new Response(response.body, { status: response.status, headers });
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
      if (!(await env.EVENT_LIMITER.limit({ key: ip })).success)
        return json({ error: 'Please try again later.' }, 429);
      if (url.pathname === '/api/stats' && request.method === 'GET') {
        if (!(await authorized(request, env.ADMIN_TOKEN)))
          return json({ error: 'Invalid dashboard key.' }, 401);
        return await stats(env);
      }
      if (url.pathname !== '/api/events' || request.method !== 'POST')
        return json({ error: 'Not found' }, 404);
      if (request.headers.get('Origin') !== url.origin)
        return json({ error: 'Origin not allowed' }, 403);
      if (!request.headers.get('Content-Type')?.startsWith('application/json'))
        return json({ error: 'JSON required' }, 415);
      if (Number(request.headers.get('Content-Length')) > 2048)
        return json({ error: 'Payload too large' }, 413);
      const body = await request.text();
      if (body.length > 2048) return json({ error: 'Payload too large' }, 413);
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(body);
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }
      if (!event || typeof event !== 'object' || !validEvent(event))
        return json({ error: 'Invalid event' }, 400);
      const { type, tableId, gameId, score, durationMs, version } = event,
        time = Date.now();
      if (type === 'view') {
        await env.DB.prepare(
          'INSERT INTO page_views(day,table_id,views) VALUES(?,?,1) ON CONFLICT(day,table_id) DO UPDATE SET views=views+1',
        )
          .bind(new Date(time).toISOString().slice(0, 10), tableId)
          .run();
      } else if (type === 'start') {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO games(id,table_id,rules_version,started_at) VALUES(?,?,?,?)',
        )
          .bind(gameId, tableId, version, time)
          .run();
      } else if (type === 'exclude') {
        await env.DB.prepare(
          'UPDATE games SET excluded=1 WHERE id=? AND table_id=? AND ended_at IS NULL',
        )
          .bind(gameId, tableId)
          .run();
      } else {
        await env.DB.prepare(
          `UPDATE games SET ended_at=?, score=?, duration_ms=? WHERE id=? AND table_id=? AND ended_at IS NULL AND excluded=0 AND started_at<=?`,
        )
          .bind(
            time,
            score,
            durationMs,
            gameId,
            tableId,
            time - Number(durationMs) + 1000,
          )
          .run();
      }
      return json({ ok: true });
    } catch {
      return json({ error: 'Statistics temporarily unavailable.' }, 503);
    }
  },
};

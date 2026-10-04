// Minimal stand-in for the Discord REST API used by the panel in end-to-end tests.
import { createServer } from 'node:http';
import { BOT_TOKEN, channelsByGuild, guildsByAccessToken, rolesByGuild } from './fixtures.mjs';

const port = Number(process.env.DISCORD_MOCK_PORT ?? 4010);

function send(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  const authorization = request.headers.authorization ?? '';

  if (url.pathname === '/health') return send(response, 200, { ok: true });

  if (request.method === 'GET' && url.pathname === '/api/v10/users/@me/guilds') {
    const list = guildsByAccessToken[authorization.replace(/^Bearer /, '')];
    if (!list) return send(response, 401, { message: '401: Unauthorized', code: 0 });
    return send(
      response,
      200,
      list.map(({ id, name, icon, owner, permissions }) => ({
        id,
        name,
        icon,
        owner,
        permissions,
      })),
    );
  }

  const guildRoute = url.pathname.match(/^\/api\/v10\/guilds\/(\d+)\/(channels|roles)$/);
  if (request.method === 'GET' && guildRoute) {
    if (authorization !== `Bot ${BOT_TOKEN}`) {
      return send(response, 401, { message: '401: Unauthorized', code: 0 });
    }
    const [, guildId, resource] = guildRoute;
    const data = (resource === 'channels' ? channelsByGuild : rolesByGuild)[guildId];
    if (!data) return send(response, 404, { message: 'Unknown Guild', code: 10004 });
    return send(response, 200, data);
  }

  send(response, 404, { message: 'Unknown route', code: 0 });
}).listen(port, () => {
  console.log(`Mock Discord API listening on http://localhost:${port}`);
});

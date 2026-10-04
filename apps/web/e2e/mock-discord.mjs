// Minimal stand-in for the Discord REST API used by the panel in end-to-end tests.
import { createServer } from 'node:http';
import {
  BOT_TOKEN,
  BOT_USER_ID,
  botRolesByGuild,
  channelsByGuild,
  guildsByAccessToken,
  rolesByGuild,
} from './fixtures.mjs';

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

  const memberRoute = url.pathname.match(/^\/api\/v10\/guilds\/(\d+)\/members\/(\d+)$/);
  if (request.method === 'GET' && memberRoute) {
    if (authorization !== `Bot ${BOT_TOKEN}`) {
      return send(response, 401, { message: '401: Unauthorized', code: 0 });
    }
    const [, guildId, userId] = memberRoute;
    const roles = userId === BOT_USER_ID ? botRolesByGuild[guildId] : undefined;
    if (!roles) return send(response, 404, { message: 'Unknown Member', code: 10007 });
    return send(response, 200, { user: { id: userId, username: 'DPlus', bot: true }, roles });
  }

  send(response, 404, { message: 'Unknown route', code: 0 });
}).listen(port, () => {
  console.log(`Mock Discord API listening on http://localhost:${port}`);
});

import { describe, expect, it } from 'vitest';
import type { GuildChannel, GuildRole } from './discord-api';
import {
  botChannelPermissions,
  ignorableChannelGroups,
  textChannelGroups,
  textChannelIds,
} from './guild-data';

function channel(
  id: string,
  name: string,
  type: number,
  position: number,
  parentId: string | null = null,
  overwrites: GuildChannel['overwrites'] = [],
): GuildChannel {
  return { id, name, type, position, parentId, overwrites };
}

const channels = [
  channel('c2', 'Moderasyon', 4, 1),
  channel('c1', 'Genel', 4, 0),
  channel('v1', 'Ses', 2, 0, 'c1'),
  channel('t1', 'sohbet', 0, 1, 'c1'),
  channel('t2', 'duyurular', 5, 2, 'c1'),
  channel('t3', 'mod-log', 0, 0, 'c2'),
  channel('t4', 'kurallar', 0, 0),
  channel('f1', 'forum', 15, 3, 'c1'),
  channel('c3', 'Boş', 4, 2),
];

describe('textChannelGroups', () => {
  it('groups text channels by category in display order', () => {
    expect(textChannelGroups(channels)).toEqual([
      { category: null, channels: [{ id: 't4', name: 'kurallar', type: 0 }] },
      {
        category: 'Genel',
        channels: [
          { id: 't1', name: 'sohbet', type: 0 },
          { id: 't2', name: 'duyurular', type: 5 },
        ],
      },
      { category: 'Moderasyon', channels: [{ id: 't3', name: 'mod-log', type: 0 }] },
    ]);
  });

  it('lists only text-like channel ids', () => {
    expect(textChannelIds(channels)).toEqual(new Set(['t1', 't2', 't3', 't4']));
  });
});

describe('ignorableChannelGroups', () => {
  it('starts each group with its category and lists voice channels last', () => {
    const groups = ignorableChannelGroups(channels);
    expect(groups.map((g) => [g.category, g.channels.map((c) => c.id)])).toEqual([
      [null, ['t4']],
      ['Genel', ['c1', 't1', 't2', 'f1', 'v1']],
      ['Moderasyon', ['c2', 't3']],
      ['Boş', ['c3']],
    ]);
  });
});

describe('botChannelPermissions', () => {
  const P = { ViewChannel: 1n << 10n, SendMessages: 1n << 11n, EmbedLinks: 1n << 14n };
  const roles: GuildRole[] = [
    {
      id: 'g',
      name: '@everyone',
      color: 0,
      position: 0,
      managed: false,
      permissions: (P.ViewChannel | P.SendMessages).toString(),
    },
    {
      id: 'bot',
      name: 'DPlus',
      color: 0,
      position: 1,
      managed: true,
      permissions: P.EmbedLinks.toString(),
    },
  ];

  it('applies channel overwrites to the bot roles', () => {
    const permissions = botChannelPermissions({
      guildId: 'g',
      botId: 'b',
      botRoleIds: ['bot'],
      roles,
      channels: [
        channel('open', 'açık', 0, 0),
        channel('closed', 'kapalı', 0, 1, null, [
          { id: 'g', type: 0, allow: '0', deny: P.SendMessages.toString() },
        ]),
      ],
    });
    expect(BigInt(permissions.open!) & P.SendMessages).toBe(P.SendMessages);
    expect(BigInt(permissions.closed!) & P.SendMessages).toBe(0n);
    expect(BigInt(permissions.closed!) & P.EmbedLinks).toBe(P.EmbedLinks);
  });
});

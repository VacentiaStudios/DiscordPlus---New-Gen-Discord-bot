import { describe, expect, it } from 'vitest';
import type { GuildChannel } from './discord-api';
import { textChannelGroups, textChannelIds } from './guild-data';

function channel(
  id: string,
  name: string,
  type: number,
  position: number,
  parentId: string | null = null,
): GuildChannel {
  return { id, name, type, position, parentId };
}

const channels = [
  channel('c2', 'Moderasyon', 4, 1),
  channel('c1', 'Genel', 4, 0),
  channel('t1', 'sohbet', 0, 0, 'c1'),
  channel('t2', 'duyurular', 5, 1, 'c1'),
  channel('v1', 'Ses', 2, 2, 'c1'),
  channel('t3', 'mod-log', 0, 0, 'c2'),
  channel('t4', 'kurallar', 0, 0),
  channel('f1', 'forum', 15, 3, 'c1'),
];

describe('textChannelGroups', () => {
  it('groups text channels by category in display order', () => {
    expect(textChannelGroups(channels)).toEqual([
      { category: null, channels: [{ id: 't4', name: 'kurallar' }] },
      {
        category: 'Genel',
        channels: [
          { id: 't1', name: 'sohbet' },
          { id: 't2', name: 'duyurular' },
        ],
      },
      { category: 'Moderasyon', channels: [{ id: 't3', name: 'mod-log' }] },
    ]);
  });

  it('lists only text-like channel ids', () => {
    expect(textChannelIds(channels)).toEqual(new Set(['t1', 't2', 't3', 't4']));
  });
});

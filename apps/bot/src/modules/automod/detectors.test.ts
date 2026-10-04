import { describe, expect, it } from 'vitest';
import {
  blockedHost,
  BurstTracker,
  countMentions,
  findInviteCodes,
  findLinkHosts,
  isMostlyCaps,
} from './detectors';

describe('findInviteCodes', () => {
  it('finds invite codes in every common form', () => {
    expect(
      findInviteCodes(
        'gel: discord.gg/abc123 https://discord.com/invite/Xyz-9 discordapp.com/invite/abc123',
      ),
    ).toEqual(['abc123', 'Xyz-9']);
    expect(findInviteCodes('discord.\u200Bgg/hidden')).toEqual(['hidden']);
    expect(findInviteCodes('discord.com/channels/1/2')).toEqual([]);
  });
});

describe('findLinkHosts', () => {
  it('collects hosts and leaves invites to the invite filter', () => {
    expect(
      findLinkHosts(
        'bak https://www.YouTube.com/watch?v=1 <https://site.example/a> [x](http://cdn.discordapp.com/f.png) https://discord.gg/abc',
      ),
    ).toEqual(['www.youtube.com', 'site.example', 'cdn.discordapp.com']);
    expect(findLinkHosts('düz metin site.com')).toEqual([]);
  });
});

describe('blockedHost', () => {
  const domains = ['youtube.com', 'discordapp.com'];

  it('allows listed sites and their subdomains in allowlist mode', () => {
    expect(
      blockedHost(['www.youtube.com', 'cdn.discordapp.com'], { mode: 'allowlist', domains }),
    ).toBeNull();
    expect(blockedHost(['www.youtube.com', 'evil.example'], { mode: 'allowlist', domains })).toBe(
      'evil.example',
    );
    // A look-alike suffix is not a subdomain.
    expect(blockedHost(['notyoutube.com'], { mode: 'allowlist', domains })).toBe('notyoutube.com');
  });

  it('blocks only listed sites in blocklist mode', () => {
    expect(blockedHost(['evil.example'], { mode: 'blocklist', domains })).toBeNull();
    expect(blockedHost(['m.youtube.com'], { mode: 'blocklist', domains })).toBe('m.youtube.com');
  });
});

describe('isMostlyCaps', () => {
  const options = { minLetters: 10, percent: 70 };

  it('flags long shouting messages', () => {
    expect(isMostlyCaps('NEDEN KİMSE CEVAP VERMİYOR', options)).toBe(true);
    expect(isMostlyCaps('Neden kimse cevap vermiyor', options)).toBe(false);
  });

  it('ignores short messages, mentions and emoji', () => {
    expect(isMostlyCaps('TAMAM OK', options)).toBe(false);
    expect(isMostlyCaps('<@123> <:KAHKAHA:456> tamam o zaman', options)).toBe(false);
  });
});

describe('countMentions', () => {
  it('counts distinct users and roles', () => {
    expect(countMentions('<@1> <@!1> <@2> <@&3> <@&3> <#4>')).toBe(3);
  });
});

describe('BurstTracker', () => {
  const limit = { max: 3, windowMs: 5_000 };
  const entry = (id: string, at: number, channelId = 'c') => ({ messageId: id, channelId, at });

  it('reports a burst once and swallows the rest of it', () => {
    const tracker = new BurstTracker();
    expect(tracker.record('u', entry('1', 0), limit)).toEqual({ type: 'ok' });
    expect(tracker.record('u', entry('2', 1_000), limit)).toEqual({ type: 'ok' });
    expect(tracker.record('u', entry('3', 2_000, 'd'), limit)).toEqual({
      type: 'burst',
      entries: [entry('1', 0), entry('2', 1_000), entry('3', 2_000, 'd')],
    });
    expect(tracker.record('u', entry('4', 3_000), limit)).toEqual({ type: 'cooldown' });
    // The window after the burst has passed: counting starts over.
    expect(tracker.record('u', entry('5', 7_500), limit)).toEqual({ type: 'ok' });
  });

  it('forgets messages outside the window', () => {
    const tracker = new BurstTracker();
    tracker.record('u', entry('1', 0), limit);
    tracker.record('u', entry('2', 1_000), limit);
    expect(tracker.record('u', entry('3', 6_000), limit)).toEqual({ type: 'ok' });
  });

  it('keeps users apart and sweeps idle keys', () => {
    const tracker = new BurstTracker();
    tracker.record('a', entry('1', 0), limit);
    tracker.record('b', entry('2', 0), limit);
    expect(tracker.size).toBe(2);
    tracker.sweep(10_000, 5_000);
    expect(tracker.size).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { checkHierarchy, type HierarchyInput } from './hierarchy';

const base: HierarchyInput = {
  actorId: 'mod',
  actorIsOwner: false,
  actorTopRole: 10,
  botId: 'bot',
  botTopRole: 20,
  targetId: 'target',
  targetIsOwner: false,
  targetTopRole: 5,
};

describe('checkHierarchy', () => {
  it('allows acting on lower members', () => {
    expect(checkHierarchy(base)).toBeNull();
  });

  it('allows acting on users who are not members', () => {
    expect(checkHierarchy({ ...base, targetTopRole: null })).toBeNull();
  });

  it.each([
    [{ targetId: 'mod' }, 'self'],
    [{ targetId: 'bot' }, 'bot'],
    [{ targetIsOwner: true }, 'owner'],
    [{ targetTopRole: 10 }, 'moderatorRole'],
    [{ targetTopRole: 15 }, 'moderatorRole'],
    [{ actorIsOwner: true, targetTopRole: 20 }, 'botRole'],
    [{ actorIsOwner: true, actorTopRole: 0, targetTopRole: 25 }, 'botRole'],
  ] as const)('reports %o as %s', (overrides, problem) => {
    expect(checkHierarchy({ ...base, ...overrides })).toBe(problem);
  });

  it('lets the owner act on members above their own top role but below the bot', () => {
    expect(
      checkHierarchy({ ...base, actorIsOwner: true, actorTopRole: 0, targetTopRole: 15 }),
    ).toBeNull();
  });
});

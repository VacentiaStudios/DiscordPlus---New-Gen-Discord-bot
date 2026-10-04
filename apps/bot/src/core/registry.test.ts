import { ApplicationCommandType, Locale } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { modules } from '../modules';
import { CommandRegistry } from './registry';
import type { BotModule } from './types';

// Discord's rule for command and option names (lowercase where a lowercase form exists).
const NAME = /^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;

interface OptionLike {
  name: string;
  description?: string;
  name_localizations?: Partial<Record<string, string | null>> | null;
  options?: OptionLike[];
}

function collectOptions(options: OptionLike[] | undefined): OptionLike[] {
  return (options ?? []).flatMap((option) => [option, ...collectOptions(option.options)]);
}

describe('command registry', () => {
  const registry = new CommandRegistry(modules);
  const payloads = registry.commandPayloads();

  it('registers every module command', () => {
    expect(payloads.length).toBeGreaterThan(0);
  });

  it.each(payloads.map((p) => [p.name, p] as const))('%s has valid, localized names', (_, p) => {
    const isSlash = p.type === undefined || p.type === ApplicationCommandType.ChatInput;
    const trName = p.name_localizations?.[Locale.Turkish];
    expect(trName, 'Turkish localization').toBeTruthy();
    if (isSlash) {
      for (const name of [p.name, trName!]) {
        expect(name).toMatch(NAME);
        expect(name).toBe(name.toLocaleLowerCase('tr'));
      }
      expect('description' in p && p.description.length).toBeGreaterThan(0);
      expect('description' in p && p.description.length).toBeLessThanOrEqual(100);

      const options = collectOptions('options' in p ? p.options : undefined);
      for (const option of options) {
        const optionTr = option.name_localizations?.[Locale.Turkish];
        expect(optionTr, `${p.name} → ${option.name} Turkish localization`).toBeTruthy();
        expect(option.name).toMatch(NAME);
        expect(optionTr).toMatch(NAME);
        expect(option.description?.length ?? 0).toBeLessThanOrEqual(100);
      }
    }
  });

  it('rejects duplicate command names', () => {
    const first = modules[0]!;
    const duplicate: BotModule = { name: 'copy', commands: first.commands ?? [] };
    expect(() => new CommandRegistry([first, duplicate])).toThrow(/Duplicate/);
  });

  it('rejects component prefixes containing ":"', () => {
    const broken: BotModule = {
      name: 'broken',
      components: [{ prefix: 'a:b', handle: () => Promise.resolve() }],
    };
    expect(() => new CommandRegistry([broken])).toThrow(/must not contain/);
  });
});

import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import type {
  AnyEventHandler,
  BotModule,
  ComponentHandler,
  MessageContextCommand,
  SlashCommand,
  UserContextCommand,
} from './types';

/** Indexes everything the modules provide and rejects name collisions early. */
export class CommandRegistry {
  readonly slash = new Map<string, SlashCommand>();
  readonly userContext = new Map<string, UserContextCommand>();
  readonly messageContext = new Map<string, MessageContextCommand>();
  readonly components = new Map<string, ComponentHandler>();
  readonly events: AnyEventHandler[] = [];

  constructor(readonly modules: readonly BotModule[]) {
    for (const module of modules) {
      for (const command of module.commands ?? []) {
        const target =
          command.type === 'slash'
            ? this.slash
            : command.type === 'user'
              ? this.userContext
              : this.messageContext;
        if (target.has(command.data.name)) {
          throw new Error(`Duplicate ${command.type} command "${command.data.name}"`);
        }
        (target as Map<string, typeof command>).set(command.data.name, command);
      }
      for (const component of module.components ?? []) {
        if (component.prefix.includes(':')) {
          throw new Error(`Component prefix "${component.prefix}" must not contain ":"`);
        }
        if (this.components.has(component.prefix)) {
          throw new Error(`Duplicate component prefix "${component.prefix}"`);
        }
        this.components.set(component.prefix, component);
      }
      this.events.push(...(module.events ?? []));
    }
  }

  /** Request bodies for registering all application commands with Discord. */
  commandPayloads(): RESTPostAPIApplicationCommandsJSONBody[] {
    return [
      ...[...this.slash.values()].map((c) => c.data),
      ...[...this.userContext.values()].map((c) => c.data),
      ...[...this.messageContext.values()].map((c) => c.data),
    ];
  }
}

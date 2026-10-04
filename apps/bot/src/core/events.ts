import type { BotContext } from './context';
import type { AnyEventHandler } from './types';

interface UntypedEventHandler {
  handle(ctx: BotContext, ...args: unknown[]): Promise<void> | void;
}

/** Subscribes module event handlers; a failing handler is logged and never crashes the bot. */
export function registerEvents(ctx: BotContext, handlers: readonly AnyEventHandler[]): void {
  for (const handler of handlers) {
    // The union of handler types cannot be correlated with its event name, so
    // arguments are passed through untyped; `defineEvent` typed them already.
    const untyped = handler as UntypedEventHandler;
    const listener = (...args: unknown[]) => {
      void (async () => {
        try {
          await untyped.handle(ctx, ...args);
        } catch (error) {
          ctx.logger.error({ err: error, event: handler.event }, 'Event handler failed');
        }
      })();
    };
    if (handler.once) ctx.client.once(handler.event, listener);
    else ctx.client.on(handler.event, listener);
  }
}

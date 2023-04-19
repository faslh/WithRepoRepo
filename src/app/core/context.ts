import { AsyncLocalStorage } from 'async_hooks';
import EventEmitter from 'events';
import { EntityManager } from 'typeorm';

class MessageBus {
    #emitter = new EventEmitter();
    #pendingEventsRegistry = new Map<
        string | symbol,
        Array<(value: any) => void>
    >();

    public send<T>(eventName: string, ...args: any[]) {
        const result$ = new Promise<T>((resolve) => {
            const resolvers = this.#pendingEventsRegistry.get(eventName) ?? [];
            resolvers.push(resolve);
            this.#pendingEventsRegistry.set(eventName, resolvers);
        });
        this.#emitter.emit(eventName, ...args);
        return result$;
    }

    #execute(eventName: string | symbol, result: any) {
        const resolvers = this.#pendingEventsRegistry.get(eventName) ?? [];
        for (const resolve of resolvers) {
            resolve(result);
        }
        this.#pendingEventsRegistry.delete(eventName);
    }

    public on(eventName: string | symbol, listener: (...args: any[]) => void) {
        this.#emitter.on(eventName, (...args: any[]) => {
            const result = listener(...args);
            this.#execute(eventName, result);
        });
    }

    public once(eventName: string | symbol, listener: (...args: any[]) => void) {
        this.#emitter.once(eventName, (...args: any[]) => {
            const result = listener(...args);
            this.#execute(eventName, result);
        });
    }
}

export const queryBus = new MessageBus();
export const commandBus = new EventEmitter();

interface AsyncContext {
    em: EntityManager;
    bus: EventEmitter;
}

export const asyncLocalStorage = new AsyncLocalStorage<AsyncContext>();
export const getContext = () => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        throw new Error('Context not found');
    }
    return store;
};

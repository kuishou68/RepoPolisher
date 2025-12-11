import { EventEmitter } from 'eventemitter3';
import type { EventType, PilotEvent } from '../types/event';

type EventHandler<T = unknown> = (event: PilotEvent<T>) => void;

export class EventBus {
  private emitter: EventEmitter;
  private eventIdCounter: number = 0;

  constructor() {
    this.emitter = new EventEmitter();
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${++this.eventIdCounter}`;
  }

  emit<T = unknown>(type: EventType, source: string, payload: T): PilotEvent<T> {
    const event: PilotEvent<T> = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      source,
      payload,
    };
    this.emitter.emit(type, event);
    this.emitter.emit('*', event);
    return event;
  }

  on<T = unknown>(type: EventType | '*', handler: EventHandler<T>): () => void {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }

  once<T = unknown>(type: EventType): Promise<PilotEvent<T>> {
    return new Promise((resolve) => {
      this.emitter.once(type, resolve);
    });
  }

  off<T = unknown>(type: EventType | '*', handler: EventHandler<T>): void {
    this.emitter.off(type, handler);
  }

  removeAllListeners(type?: EventType | '*'): void {
    if (type) {
      this.emitter.removeAllListeners(type);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

export const eventBus = new EventBus();

import { useSyncExternalStore } from "react";
import { reactivityHub, SignalHolder } from "./reactivity-hub";
import { SetterPayload, Signal, SignalListener } from "./types";

export function createSignal<T>(initialValue: T): Signal<T> {
  const key = Symbol();
  const holder: SignalHolder<T> = {
    value: initialValue,
    listeners: new Set(),
  };
  reactivityHub.registerSignal(key, holder);

  const subscribe = (listener: SignalListener) => {
    holder.listeners.add(listener);
    return () => holder.listeners.delete(listener);
  };

  const signal: Signal<T> = {
    get value() {
      const ce = reactivityHub.getCurrentEffect();
      if (ce && !ce.signalHolders.has(holder)) {
        ce.signalHolders.add(holder);
        const unsubscribe = subscribe(ce.listener);
        ce.cleanup.push(unsubscribe);
      }
      return holder.value;
    },
    setValue(arg: SetterPayload<T>) {
      const value =
        typeof arg === "function" ? (arg as (prev: T) => T)(holder.value) : arg;
      if (value === holder.value) return;

      holder.value = value;
      holder.listeners.forEach((listener) => {
        reactivityHub.addPendingListener(listener);
      });
      reactivityHub.scheduleFlush();
    },
    subscribe,
    use() {
      const value = useSyncExternalStore(subscribe, () => holder.value);
      return value;
    },
  };
  return signal;
}

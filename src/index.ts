import { produce } from "immer";
import { useEffect, useMemo, useSyncExternalStore } from "react";

type SignalListener = () => void;

type SignalHolder<T> = {
  value: T;
  listeners: Set<SignalListener>;
};

type SetterPayload<T> = T | ((prev: T) => T);

export type Signal<T> = {
  readonly value: T;
  setValue(arg: SetterPayload<T>): void;
  subscribe(listener: SignalListener): () => void;
  use(): T;
};

type EffectReceiver = {
  listener: () => void;
  signalHolders: Set<SignalHolder<any>>;
  cleanup: (() => void)[];
};

type ReactivityHub = {
  // biome-ignore lint/complexity/noBannedTypes: false
  signalHolders: Map<Symbol, SignalHolder<any>>;
  currentEffect: EffectReceiver | undefined;
  pendingListeners: Set<SignalListener>;
  flushScheduled: boolean;
};

function createReactivityHub(): ReactivityHub {
  return {
    signalHolders: new Map(),
    currentEffect: undefined,
    pendingListeners: new Set(),
    flushScheduled: false,
  };
}
const reactivityHub = createReactivityHub();

function scheduleFlush() {
  if (reactivityHub.flushScheduled) return;
  reactivityHub.flushScheduled = true;

  Promise.resolve().then(() => {
    const listeners = Array.from(reactivityHub.pendingListeners);
    reactivityHub.pendingListeners.clear();
    reactivityHub.flushScheduled = false;

    listeners.forEach((listener) => {
      listener();
    });
  });
}

function createEffectReceiver(fn: () => void): EffectReceiver {
  return {
    listener: fn,
    signalHolders: new Set(),
    cleanup: [],
  };
}

export function createSignal<T>(initialValue: T): Signal<T> {
  const key = Symbol();
  const holder: SignalHolder<T> = {
    value: initialValue,
    listeners: new Set(),
  };
  reactivityHub.signalHolders.set(key, holder);

  const subscribe = (listener: SignalListener) => {
    holder.listeners.add(listener);
    return () => holder.listeners.delete(listener);
  };

  const signal: Signal<T> = {
    get value() {
      const ce = reactivityHub.currentEffect;
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
        reactivityHub.pendingListeners.add(listener);
      });
      scheduleFlush();
    },
    subscribe,
    use() {
      const value = useSyncExternalStore(subscribe, () => holder.value);
      return value;
    },
  };
  return signal;
}

function capitalizeFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Mutations<T> = {
  [K in keyof T as `set${Capitalize<K & string>}`]: (
    value: T[K] | ((prev: T[K]) => T[K]),
  ) => void;
} & {
  [K in keyof T as `produce${Capitalize<K & string>}`]: (
    fn: (draft: T[K]) => void,
  ) => void;
} & {
  [K in keyof T as `patch${Capitalize<K & string>}`]: (
    attrs: Partial<T[K]>,
  ) => void;
} & {
  assigns: (attrs: Partial<T>) => void;
};

type ReadonlySignal<T> = {
  readonly value: T;
  subscribe(listener: SignalListener): () => void;
  readonly snapshotValue: T;
  use(): T;
  cleanup(): void;
};

export type Store<T extends object> = {
  state: T;
  snapshot: T;
  useSnapshot(): T; //store.useSnapshot() is equivalent to store.snapshot
  mutations: Mutations<T>;
  signals: { [K in keyof T]: Signal<T[K]> };
};

export function createStore<T extends object>(initialState: T): Store<T> {
  type K = keyof T;
  const stateGetters: any = {};
  const snapshotGetters: any = {};
  const mutations: any = {};
  const signals: any = {};

  for (const key in initialState) {
    const initialValue = initialState[key];
    const signal = createSignal(initialValue);

    Object.defineProperty(stateGetters, key, {
      get() {
        return signal.value;
      },
    });
    Object.defineProperty(snapshotGetters, key, {
      get() {
        return signal.use();
      },
    });
    mutations[`set${capitalizeFirstLetter(key as string)}`] = signal.setValue;
    mutations[`produce${capitalizeFirstLetter(key)}`] = (
      fn: (draft: T[K]) => void,
    ) => {
      signal.setValue((draft) => produce(draft, fn));
    };
    mutations[`patch${capitalizeFirstLetter(key)}`] = (
      attrs: Partial<T[K]>,
    ) => {
      signal.setValue((prev) => ({ ...prev, ...attrs }));
    };
    signals[key] = signal;
  }
  Object.assign(mutations, {
    assigns: (attrs: Partial<T>) => {
      for (const key in attrs) {
        const value = attrs[key];
        const setValue = mutations[`set${capitalizeFirstLetter(key)}`];
        setValue?.(value);
      }
    },
  });

  return {
    state: stateGetters,
    snapshot: snapshotGetters,
    useSnapshot: () => snapshotGetters,
    mutations,
    signals,
  };
}

export const effect = (fn: () => void): (() => void) => {
  const effectReceiver = createEffectReceiver(fn);

  // Set current effect for dependency tracking
  const prevEffect = reactivityHub.currentEffect;
  reactivityHub.currentEffect = effectReceiver;

  try {
    fn(); // Execute effect to collect dependencies
  } finally {
    reactivityHub.currentEffect = prevEffect;
  }

  // Return cleanup function
  return () => {
    effectReceiver.cleanup.forEach((cleanup) => {
      cleanup();
    });
    effectReceiver.cleanup.length = 0;
    effectReceiver.signalHolders.clear();
  };
};

export const computed = <U>(fn: () => U): ReadonlySignal<U> => {
  // biome-ignore lint/style/noNonNullAssertion: false
  const internalSignal = createSignal<U>(undefined!);

  let initialized: boolean;
  let cleanupEffect: (() => void) | undefined;

  const ensureInitialized = () => {
    if (!initialized) {
      const effectReceiver = createEffectReceiver(() => {
        const newValue = fn();
        internalSignal.setValue(newValue);
      });

      const prevEffect = reactivityHub.currentEffect;
      reactivityHub.currentEffect = effectReceiver;

      try {
        const initialValue = fn();
        internalSignal.setValue(initialValue);
      } finally {
        reactivityHub.currentEffect = prevEffect;
      }

      cleanupEffect = () => {
        effectReceiver.cleanup.forEach((cleanup) => {
          cleanup();
        });
        effectReceiver.cleanup.length = 0;
        effectReceiver.signalHolders.clear();
      };

      initialized = true;
    }
  };

  return {
    get value() {
      ensureInitialized();
      return internalSignal.value;
    },
    get snapshotValue() {
      ensureInitialized();
      return internalSignal.use();
    },
    use() {
      ensureInitialized();
      return internalSignal.use();
    },
    subscribe: internalSignal.subscribe,
    cleanup() {
      cleanupEffect?.();
    },
  };
};

// Used when utilizing values derived from multiple stores in the UI
// Not used for local hooks' state or other non-store values
export const useDerived = <U>(fn: () => U): U => {
  const computedSignal = useMemo(() => computed(fn), [fn]);
  const value = computedSignal.use();
  useEffect(() => {
    return () => computedSignal.cleanup();
  }, [computedSignal]);
  return value;
};

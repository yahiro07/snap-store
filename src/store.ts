import { produce } from "immer";
import { useEffect, useRef, useState } from "react";
import { capitalizeFirstLetter, removeArrayItem } from "./helper";
import { ChangesListener, Mutations, Store } from "./types";

export function createStore<T extends object>(initialState: T): Store<T> {
  type K = Extract<keyof T, string>;
  type V = T[K];

  type HookEntry = {
    dependentFieldKeys: Set<K>;
    refreshView: (() => void) | undefined;
    getterObject: T;
    activate: () => void;
    deactivate: () => void;
  };

  const hub: Record<string, HookEntry> = {};

  const state = initialState;
  const mutations = {} as Mutations<T>;
  const _mutations = mutations as any;

  const listeners: ChangesListener<T>[] = [];
  let changeset: Partial<T> | undefined;
  let flushScheduled = false;

  function flushChanges() {
    if (changeset) {
      for (const listener of listeners) {
        listener(changeset);
      }
      changeset = undefined;
    }
    flushScheduled = false;
  }
  function scheduleFlush() {
    if (!flushScheduled) {
      queueMicrotask(flushChanges);
      flushScheduled = true;
    }
  }

  for (const _key in initialState) {
    const key = _key as K;

    const setValue = (arg: V | ((prev: V) => V)) => {
      let value: V;
      if (typeof arg === "function") {
        value = (arg as (prev: V) => V)(state[key]);
      } else {
        value = arg;
      }
      if (value === state[key]) {
        return;
      }
      state[key] = value;

      changeset ??= {};
      changeset[key] = value;
      scheduleFlush();

      for (const hubKey in hub) {
        const entry = hub[hubKey];
        if (entry.dependentFieldKeys.has(key)) {
          entry.refreshView?.();
        }
      }
    };
    const suffix = capitalizeFirstLetter(key);
    _mutations[`set${suffix}`] = setValue;
    _mutations[`produce${suffix}`] = (fn: (draft: V) => void) => {
      setValue((draft) => produce(draft, fn));
    };
    _mutations[`patch${suffix}`] = (
      input: Partial<V> | ((prev: V) => Partial<V>),
    ) => {
      setValue((prev) => {
        const attrs =
          typeof input === "function"
            ? (input as (prev: V) => Partial<V>)(prev)
            : input;
        return { ...prev, ...attrs };
      });
    };
  }
  mutations.assigns = (attrs: Partial<T>) => {
    for (const key in attrs) {
      const suffix = capitalizeFirstLetter(key);
      const value = attrs[key];
      const setValue = _mutations[`set${suffix}`];
      setValue?.(value);
    }
  };

  const createHookEntry = (hookId: string): HookEntry => {
    const getterObject = {} as T;
    const dependentFieldKeys = new Set<K>();
    for (const key in initialState) {
      Object.defineProperty(getterObject, key, {
        get() {
          if (!dependentFieldKeys.has(key)) {
            dependentFieldKeys.add(key);
          }
          return state[key];
        },
      });
    }
    const hookEntry: HookEntry = {
      dependentFieldKeys,
      refreshView: undefined,
      getterObject,
      activate() {
        hub[hookId] = hookEntry;
      },
      deactivate() {
        if (hub[hookId] === hookEntry) {
          delete hub[hookId];
        }
      },
    };
    return hookEntry;
  };

  const useSnapshot = (): T => {
    const [, forceRender] = useState(0);
    const entryRef = useRef<HookEntry | null>(null);
    if (!entryRef.current) {
      const id = Math.random().toString(36).substring(2, 15);
      entryRef.current = createHookEntry(id);
    }
    useEffect(() => {
      if (entryRef.current) {
        entryRef.current.refreshView = () => forceRender((x) => x + 1);
        entryRef.current.activate();
      }
      return () => {
        entryRef.current?.deactivate();
      };
    }, []);
    return entryRef.current.getterObject;
  };

  const subscribe = (fn: ChangesListener<T>) => {
    listeners.push(fn);
    return () => {
      removeArrayItem(listeners, fn);
    };
  };

  return {
    state,
    useSnapshot,
    get snapshot() {
      return useSnapshot();
    },
    subscribe,
    mutations,
    ...mutations,
  };
}

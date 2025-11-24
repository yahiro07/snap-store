import { produce } from "immer";
import { useEffect, useId, useMemo, useState } from "react";
import { capitalizeFirstLetter } from "./helper";
import { Mutations, Store } from "./types";

export function createStore<T extends object>(initialState: T): Store<T> {
  type K = Extract<keyof T, string>;
  type V = T[K];

  const hub: Record<
    string,
    { dependentFieldKeys: Set<K>; refreshView: () => void }
  > = {};

  const state = initialState;
  const mutations = {} as Mutations<T>;
  const _mutations = mutations as any;

  for (const _key in initialState) {
    const key = _key as K;

    const setValue = (arg: V | ((prev: V) => V)) => {
      let value: V;
      if (typeof arg === "function") {
        value = (arg as (prev: V) => V)(state[key]);
      } else {
        value = arg;
      }

      state[key] = value;
      for (const hubKey in hub) {
        const entry = hub[hubKey];
        if (entry.dependentFieldKeys.has(key)) {
          entry.refreshView();
        }
      }
    };
    const suffix = capitalizeFirstLetter(key);
    _mutations[`set${suffix}`] = setValue;
    _mutations[`produce${suffix}`] = (fn: (draft: V) => void) => {
      setValue((draft) => produce(draft, fn));
    };
    _mutations[`patch${suffix}`] = (attrs: Partial<V>) => {
      setValue((prev) => ({ ...prev, ...attrs }));
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

  const createHookEntry = (hookId: string, refreshView: () => void) => {
    hub[hookId] = { dependentFieldKeys: new Set(), refreshView };
    const getterObject = {} as T;
    for (const key in initialState) {
      Object.defineProperty(getterObject, key, {
        get() {
          hub[hookId].dependentFieldKeys.add(key);
          return state[key];
        },
      });
    }
    const cleanup = () => {
      delete hub[hookId];
    };
    return { getterObject, cleanup };
  };

  const useSnapshot = (): T => {
    const hookId = useId();
    const [, setRenderObject] = useState({});
    const hookEntry = useMemo(
      () => createHookEntry(hookId, () => setRenderObject({})),
      [hookId],
    );
    useEffect(() => {
      return hookEntry.cleanup;
    }, [hookEntry]);
    return hookEntry.getterObject;
  };

  return {
    state,
    useSnapshot,
    get snapshot() {
      return useSnapshot();
    },
    ...mutations,
  };
}

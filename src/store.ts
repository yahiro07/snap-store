import { produce } from "immer";
import { capitalizeFirstLetter } from "./helpers";
import { createSignal } from "./signal";
import { Store } from "./types";

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

export type SignalListener = () => void;

export type SetterPayload<T> = T | ((prev: T) => T);

//purer signal, created for each field of the state object
export type Signal<T> = {
  readonly value: T;
  setValue(arg: SetterPayload<T>): void;
  subscribe(listener: SignalListener): () => void;
  use(): T;
};

//computed signal, returned value of computed() function
export type ComputedSignal<T> = {
  readonly value: T;
  subscribe(listener: SignalListener): () => void;
  readonly snapshotValue: T;
  use(): T;
  cleanup(): void;
};

export type Mutations<T> = {
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

export type Store<T extends object> = {
  state: T;
  snapshot: T;
  useSnapshot(): T; //store.useSnapshot() is equivalent to store.snapshot
  mutations: Mutations<T>;
  signals: { [K in keyof T]: Signal<T[K]> };
};

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
    input:
      | Partial<Extract<T[K], object>>
      | ((prev: T[K]) => Partial<Extract<T[K], object>>),
  ) => void;
} & {
  assigns: (attrs: Partial<T>) => void;
};

export type ChangesListener<T extends object> = (attrs: Partial<T>) => void;

export type Store<T extends object> = {
  state: T;
  useSnapshot(): T;
  snapshot: T; //same as useSnapshot()
  subscribe: (listener: ChangesListener<T>) => () => void;
  mutations: Mutations<T>;
} & Mutations<T>;

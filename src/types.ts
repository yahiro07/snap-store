export type Mutations<T> = {
  [K in keyof T as `set${Capitalize<K & string>}`]: (
    value: T[K] | ((prev: T[K]) => T[K]),
  ) => void;
} & {
  [K in keyof T as T[K] extends object
    ? `produce${Capitalize<K & string>}`
    : never]: (fn: (draft: T[K]) => void) => void;
} & {
  [K in keyof T as T[K] extends object
    ? `patch${Capitalize<K & string>}`
    : never]: (
    input:
      | Partial<Extract<T[K], object>>
      | ((prev: T[K]) => Partial<Extract<T[K], object>>),
  ) => void;
} & {
  [K in keyof T as T[K] extends boolean
    ? `toggle${Capitalize<K & string>}`
    : never]: () => void;
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

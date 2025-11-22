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
  useSnapshot(): T;
  snapshot: T; //same as useSnapshot()
  mutations: Mutations<T>;
};

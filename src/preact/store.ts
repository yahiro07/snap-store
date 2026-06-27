import { useEffect, useRef, useState } from "preact/hooks";
import { createStoreImpl } from "../store-impl";
import { Store } from "../types";

export function createStore<T extends object>(initialState: T): Store<T> {
  return createStoreImpl<T>(initialState, { useEffect, useRef, useState });
}

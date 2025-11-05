import { EffectReceiver, reactivityHub } from "./reactivity-hub";
import { createSignal } from "./signal";
import { ComputedSignal } from "./types";

function createEffectReceiver(fn: () => void): EffectReceiver {
  return {
    listener: fn,
    signalHolders: new Set(),
    cleanup: [],
  };
}

export const effect = (fn: () => void): (() => void) => {
  const effectReceiver = createEffectReceiver(fn);

  // Set current effect for dependency tracking
  const prevEffect = reactivityHub.getCurrentEffect();
  reactivityHub.setCurrentEffect(effectReceiver);

  try {
    fn(); // Execute effect to collect dependencies
  } finally {
    reactivityHub.setCurrentEffect(prevEffect);
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

export const computed = <U>(fn: () => U): ComputedSignal<U> => {
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

      const prevEffect = reactivityHub.getCurrentEffect();
      reactivityHub.setCurrentEffect(effectReceiver);

      try {
        const initialValue = fn();
        internalSignal.setValue(initialValue);
      } finally {
        reactivityHub.setCurrentEffect(prevEffect);
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

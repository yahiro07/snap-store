import { SignalListener } from "./types";

export type SignalHolder<T> = {
  value: T;
  listeners: Set<SignalListener>;
};

export type EffectReceiver = {
  listener: () => void;
  signalHolders: Set<SignalHolder<any>>;
  cleanup: (() => void)[];
};

type ReactivityHub = {
  registerSignal(key: symbol, holder: SignalHolder<any>): void;
  getCurrentEffect(): EffectReceiver | undefined;
  setCurrentEffect(effect: EffectReceiver | undefined): void;
  addPendingListener(listener: SignalListener): void;
  scheduleFlush(): void;
};

function createReactivityHub(): ReactivityHub {
  const signalHolders = new Map<symbol, SignalHolder<any>>();
  let currentEffect: EffectReceiver | undefined;
  const pendingListeners = new Set<SignalListener>();
  let flushScheduled = false;

  return {
    registerSignal(key: symbol, holder: SignalHolder<any>) {
      signalHolders.set(key, holder);
    },
    getCurrentEffect() {
      return currentEffect;
    },
    setCurrentEffect(effect: EffectReceiver | undefined) {
      currentEffect = effect;
    },
    addPendingListener(listener: SignalListener) {
      pendingListeners.add(listener);
    },
    scheduleFlush() {
      if (flushScheduled) return;
      flushScheduled = true;

      Promise.resolve().then(() => {
        const listeners = Array.from(pendingListeners);
        pendingListeners.clear();
        flushScheduled = false;

        listeners.forEach((listener) => {
          listener();
        });
      });
    },
  };
}

export const reactivityHub = createReactivityHub();

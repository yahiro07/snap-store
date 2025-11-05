# snap-store

## Introduction

This is an easy-to-use global state management library for React.

## Installation
```sh
npm install snap-store
```

## Motivation

I like [valtio](https://github.com/pmndrs/valtio). But sometimes I'm confused by its proxy based design.
So I wanted to have a non-proxy version of this.

I researched some signal based libraries and how to make them work on React.
I found some hooks (`useSyncExternalStore`) could be used to implement it.
After struggling for a while, finally I got my own store library working!

```ts
import {createStore} from "snap-store"

const store = createStore({ count: 0});

const Counter = () => {
  const { count } = store.snapshot;
  const { setCount } = store.mutations;
  return <button onClick={() => setCount(prev => prev + 1)}>
    {count}
  </button>
}
```

## How it works
```ts
const store = createStore({ count: 0});
```
`createStore` takes an initial state object and returns a store.
The store holds wrapper signals for each field of the state object.
```ts
const { count } = store.snapshot;
```
In a component, `snapshot` getter is used to refer to the states and make them reactive.
For this line, `count` is actually a getter and it registers a listener to track the value change.

## Usage Examples
```ts
const store = createStore({ count: 0});

function handleButton(){
  const { count } = store.state;    //read store state
  store.mutations.setCount(currentCount + 1); //mutate by value
  store.mutations.setCount(prev => prev + 1); //mutate by function
}

const Component = () => {
  const { count } = store.snapshot;		//refer store state as reactive
  return <button onClick={handleButton}>push me {count}</button>
}
```
In the component, `store.snapshot` is used to refer to the store state as a reactive value.

Since this is a global state library, you can also read and write store states outside components.
`store.state` is used to read the value in non-component functions.

`store.mutations` has no difference in component or non-component context.

```ts
const store = createStore({ user: {name: "John", age: 20 }});
store.mutations.setUser({ name: "Mike", age: 20});       //value
store.mutations.setUser(prev => ({...prev, age: 21}));     //by function
store.mutations.patchUser({ age: 22});		//partial update (merged)
store.mutations.produceUser(draft => { draft.age = 23 })    //update with immer
```
It comes with various update methods for each field.

`set*` methods are similar to the setter function of `useState`. It takes a value or a function.

`patch*` could be used for a partial update. The new state is merged with the previous state and new attributes.

`produce*` wraps the `produce` function of `immer`. (`immer` is included in the dependencies.)

```ts
const store = createStore({ 
  penWidth: 3, 
  penColor: 'black', 
  penStyle: 'normal'
});
store.mutations.assigns({ penWidth: 1, penStyle: 'dashed' });
//is equivalent to
store.mutations.setPenWidth(1);
store.mutations.setPenStyle('dashed');
```
In mutations, there is `assigns` method to set multiple fields at a time.
It is useful if you want to update multiple values.

There is no performance difference since reactive effects (i.e. rendering) are batched and executed in the next frame.

```ts
const store = createStore<{theme: "light" | "dark"}>({theme: "light" })

const ThemeSelector = () => {
  const { theme } = store.snapshot;
  const { setTheme } = store.mutations;
  return <div>
    <IconButton  icon="☀️" active={theme === 'light'} onClick={() => setTheme("light") />
    <IconButton  icon="🌙" active={theme === 'dark'} onClick={() => setTheme("dark") />
  </div>
}
```
Here is a typical theme selector example.

```ts
const store = createStore<{textSize: number, bgColor: string}>({textSize: 5, bgColor: "#ffffff" })

const BookReaderSettings = () => {
  const snap = store.snapshot;
  const mut = store.mutations;
  return <div>
    <Slider value={snap.textSize} onChange={mut.setTextSize} min={10} max={20} />
    <ColorInput value={snap.bgColor} onChange={mut.setBgColor} />
  </div>
}
```
Sometimes it might provide good editor completions for non-destructive use.
However there are caveats in some cases (read below).

## Caveats
```ts
const store = createStore({ name: "Mike", age: 20 });

//wrong code
const Component = () => {
  const snap = store.snapshot;
  if(snap.age < 20) return; //bad early return
  return <div>Hello Gentleman, {snap.name}</div>
}

//working code
const Component = () => {
  const { age, name }  = store.snapshot;
  if(age < 20) return;  //no problem
  return <div>Hello Gentleman, {name}</div>
}
```
Each member of the snapshot object is a getter and it calls a hooks (`useSyncExternalStore`) internally.

Since a component must have the same hooks count for each render, non-destructive assign and early return are a bad combination.

The snapshot should be destructured if you have an early return.

## Other Signal functionalities
```ts
const store = createStore({ count: 0 });

effect(() => {
  const count = store.state.count;
  console.log("Effect:", count);
});

store.mutations.setCount((prev) => prev + 1);

const doubled = computed(() => {
  const cnt = store.state.count;
  console.log("computing for:", cnt);
  return cnt * 2;
});
console.log("Doubled:", doubled.value);
```
There are two `effect()` and `computed()` helper functions intended to be used in non-component context.

`effect()` tracks the referred state changes in the callback and is automatically re-evaluated when the tracked values change.

`computed()` is used for caching the computation result, returning the read-only signal. It is re-evaluated when tracked values change.

## References
- [valtio](https://github.com/pmndrs/valtio)
- [@preact/signals-react](https://github.com/preactjs/signals)

snap-store is highly influenced by these libraries.

Compared to `valtio`, this library provides a similar design of global store but it doesn't use proxies. Also the mutations are applied by the methods not by assignment.

Compared to `@preact/signals-react`, although the mechanism of the signal is similar, this library is aimed to supply an opinionated store system whereas `@preact/signals` provides the basic primitive signal functions.

## License

MIT License



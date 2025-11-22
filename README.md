# snap-store

Easy-to-use global state management library for React.

## Installation
```sh
npm install snap-store
```

## Overview

**snap-store** simplifies global state management in React. 

In apps like graphical editors or tools with editing functionality, it's often desirable to maintain state in a global store accessible throughout the application.

This library is designed to let you place app state to a central store while keeping your existing component implementations mostly intact. 

It minimizes boilerplate code and complex hook calls, making it easy to create a central store that can be shared across multiple components.


### Key Features

**snap-store** is designed with the following principles:

1. **Easy to Migrate from Local State**: Store state is subscribed as plain values and updated with methods like `setValue(newValue)`, making it easy to migrate from local `useState` to a global store with minimal component changes.

2. **Consistent Access Pattern**: Both in-component and out-of-component store access use a similar API, making it easy to extract complex state update logic outside of components.

3. **Convenient Update Methods**: In addition to basic setters, the library provides useful update methods like `patch*` for partial updates and `produce*` for immer-based updates.

## Basic Usage

```ts
import {createStore} from "snap-store"

const store = createStore({ count: 0});

const Counter = () => {
  const { count } = store.useSnapshot();
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
```ts
const { count } = store.useSnapshot();
```
In a component, `useSnapshot()` hook is used to refer to the states and make them reactive.
For this line, `count` is actually a getter and it registers a listener to track the value change.

## Examples
```ts
const store = createStore({ count: 0});

function handleButton(){
  const { count } = store.state;    //read store state
  store.mutations.setCount(currentCount + 1); //mutate by value
  store.mutations.setCount(prev => prev + 1); //mutate by function
}

const Component = () => {
  const { count } = store.useSnapshot();		//refer store state as reactive
  return <button onClick={handleButton}>push me {count}</button>
}
```
In the component, `store.useSnapshot()` is used to refer to the store state as a reactive value.

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

There is no performance difference since reactive effects (i.e. rendering) are batched by React and executed in the next frame.

```ts
const store = createStore<{theme: "light" | "dark"}>({theme: "light" })

const ThemeSelector = () => {
  const { theme } = store.useSnapshot();
  const { setTheme } = store.mutations;
  return <div>
    <IconButton
      icon="☀️"
      active={theme === 'light'}
      onClick={() => setTheme("light")}
    />
    <IconButton
      icon="🌙"
      active={theme === 'dark'}
      onClick={() => setTheme("dark")}
    />
  </div>
}
```
Here is a typical theme selector example.

```ts
const store = createStore<{textSize: number, bgColor: string}>({
  textSize: 5,
  bgColor: "#ffffff"
})

const BookReaderSettings = () => {
  const snap = store.useSnapshot();;
  const mut = store.mutations;
  return <div>
    <Slider
      value={snap.textSize}
      onChange={mut.setTextSize}
      min={10}
      max={20}
    />
    <ColorInput
      value={snap.bgColor}
      onChange={mut.setBgColor}
    />
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
  const snap = store.useSnapshot();;
  if(snap.age < 20) return; //bad early return
  return <div>Hello Gentleman, {snap.name}</div>
}

//working code
const Component = () => {
  const { age, name }  = store.useSnapshot();;
  if(age < 20) return;  //no problem
  return <div>Hello Gentleman, {name}</div>
}
```
Each member of the snapshot object is a getter and it calls a hooks internally.

Since a component must have the same hooks count for each render, non-destructive assign and early return are a bad combination.

The snapshot object should be destructured if you have an early return.

## License

MIT License




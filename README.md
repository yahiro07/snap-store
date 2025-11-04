# snap-store

## Introduction

This an easy-to-use global state management library for React.

## Installation
```sh
npm install snap-store
```

## Motivation

I like valtio. but sometime I'm confused by it's proxy based design.
so I wanted to have a non-proxy version of this.
I researched some signal based libraries and how to make them work on React.
I found some hooks (useSyncExternalStore) could be used to implement it.
After struggling a while, finally I got my own store library worked!

```ts
import {createStore} from "snap-store"
const store = createStore({ count: 0});

const Counter = () => {
	const {count} = store.snapshot;
	const {setCount} = store.mutations;
  return <button onClick={() => setCount(prev => prev + 1)}>
	  {count}
  </button>
}
```

## How it works
```ts
const store = createStore({ count: 0});
```
createStore takes initial state object and returns a store.
The store holds wrapper signals for each field of the state object.
```ts
const {count} = store.snapshot;
```
In a component, snapshot getter is used to refer the states and having them reactive.
For this line, count is actually a getter and it  register a listener to track the value change.

## Usage Examples
```ts
const store = createStore({ count: 0});

function handleButton(){
	const currentCount = store.state.count;    //read store state
	store.mutations.setCount(currentCount + 1); //mutate by assign
	store.mutations.setCount(prev => prev + 1); //mutate by function
}

const Component = () => {
  return <button onClick={handleButton}>push me</button>
}
```
Since this is a global state library, you can read and write store states outside components.
Just refer the store.state to read the value in non-component functions.
store.mutations are no difference in component or non-component context.

```ts
const store = createStore({ user: {name: "John", age: 20 }});
store.mutations.setUser({ name: "Mike", age: 20});       //value
store.mutations.setUser(prev => ({...prev, age: 21});     //by function
store.mutations.patchUser({ age: 22});		//partial update (merged)
store.mutations.produceUser(draft => { draft.age = 23 })    //update with immer
```
It come with various update methods for each field.
set* are similar to setter function of useState. It takes value or function.
patch* could be used for partial update. the new state is merged previous state and new attributes.
produce* wraps produce function for immer. (Immer is included in dependency.)


```ts
const store = createStore<{theme: "light" | "dark"}>({theme: "light" })

const ThemeSelector = () => {
	const {theme} = store.snapshot;
	const {setTheme} = store.mutations;
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
Sometimes it might  be good editor completions for non-destructive use.
However there are cavates in some case (read below).

## Cavates
```ts
const store = createStore({ name: "Mike", age: 20 });

//wrong code
const Component = () => {
  const snap = store.snapshot;
  if(snap.age < 20) return;
  return <div>Hello Gentleman, {snap.name}</div>
}

//working code
const Component = () => {
  const {age, name}  = store.snapshot;
  if(age < 20) return;
  return <div>Hello Gentleman, {name}</div>
}
```
Each member of snapshot object are getter and it calls a hooks (useSyncExternalStore) internally.
Since a component must be the same hooks count for each renders, non-destructive assign and
early return are the bad combination. It should be the snapshot destructured if you have an early return.

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
There are two effect() and computed() helper functions intended to be used in non-component context.
effect() tracks the referred state changes in the callback and automatically re-evaluated when the tracked values change.
computed() is used for caching the computation result, returning the read-only signal. Re-evaluated when tracked values change.

## References
- Valtio
- preact/signals-react
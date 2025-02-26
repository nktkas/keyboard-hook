# keyboard-hook

[![JSR](https://jsr.io/badges/@nktkas/keyboard-hook)](https://jsr.io/@nktkas/keyboard-hook)

Library for listening to global keyboard press events.

## Features

- Written for [Deno](https://deno.com) + Windows 11 x64.
- Uses native user32.dll, so no external modules are needed.
- Launches the [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) to ensure that interaction
  with user32.dll does not block the main loop.
- Event processing is very fast, about 1 ms from event emulation to event processing.

## Usage example

```ts
import { KeyboardHook } from "@nktkas/keyboard-hook";

const hook = new KeyboardHook();
hook.addEventListener("keydown", (event) => {
    console.log("Key down:", event.detail);
});
hook.addEventListener("keyup", (event) => {
    console.log("Key up:", event.detail);
});
hook.addEventListener("syskeydown", (event) => {
    console.log("System key down:", event.detail);
});
hook.addEventListener("syskeyup", (event) => {
    console.log("System key up:", event.detail);
});
hook.start();
```

## API

```ts
/** Keyboard event structure. */
export interface KeyEvent {
    /** Virtual key code. See {@linkcode Key}. */
    vkCode: number;
    /** Hardware scan code. */
    scanCode: number;
    /** Event flags. */
    flags: number;
    /** Time of the event. */
    time: number;
    /** Extra information. */
    extraInfo: bigint;
}

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends EventTarget {
    /** Starts monitoring of keyboard events. */
    start(): void;

    /** Stops monitoring of keyboard events. */
    stop(): void;

    /** Strictly typed addEventListener. */
    addEventListener(
        type: "keydown" | "keyup" | "syskeydown" | "syskeyup",
        listener: (event: CustomEvent<KeyEvent>) => void,
    ): void;
}

/** Enumeration of keyboard keys and their virtual key codes. */
export const Key = {
    Backspace: 0x000E,
    Tab: 0x000F,
    Enter: 0x001C,
    CapsLock: 0x003A,
    Escape: 0x0001,
    ...
};
```

## Benchmarks

### Keyhold

```bash
deno run --allow-ffi .\benchmarks\keyhold.ts
```

```
Basic Information::
┌───────────────┬────────┬───────────────┐
│ Duration (ms) │ Events │ Events/Second │
├───────────────┼────────┼───────────────┤
│ 1000          │ 96     │ 96.00         │
│ 2000          │ 196    │ 98.00         │
│ 5000          │ 496    │ 99.20         │
│ 10000         │ 996    │ 99.60         │
└───────────────┴────────┴───────────────┘

Emit to Receive Latency (ms):
┌───────────────┬───────┬───────┬────────┬───────┬───────────┬───────────┬───────┐
│ Duration (ms) │ Min   │ Avg   │ Median │ Stdev │ 95th %ile │ 99th %ile │ Max   │
├───────────────┼───────┼───────┼────────┼───────┼───────────┼───────────┼───────┤
│ 1000          │ 0.029 │ 0.050 │ 0.036  │ 0.087 │ 0.066     │ 0.668     │ 1.083 │
│ 2000          │ 0.027 │ 0.042 │ 0.032  │ 0.063 │ 0.064     │ 0.097     │ 1.315 │
│ 5000          │ 0.027 │ 0.043 │ 0.036  │ 0.030 │ 0.066     │ 0.093     │ 0.671 │
│ 10000         │ 0.027 │ 0.040 │ 0.035  │ 0.023 │ 0.061     │ 0.090     │ 0.804 │
└───────────────┴───────┴───────┴────────┴───────┴───────────┴───────────┴───────┘
```

### Keypress

```bash
deno run --allow-ffi .\benchmarks\keypress.ts
```

```
Basic Information:
┌───────────┬─────────────┬───────────────┬───────────────┬─────────────┐
│ Rate (/s) │ Key Presses │ Keydowns (%)  │ Keyups (%)    │ Success (%) │
├───────────┼─────────────┼───────────────┼───────────────┼─────────────┤
│ 5         │ 48          │ 48 (100.00%)  │ 48 (100.00%)  │ 100.00%     │
│ 10        │ 98          │ 98 (100.00%)  │ 98 (100.00%)  │ 100.00%     │
│ 20        │ 194         │ 194 (100.00%) │ 194 (100.00%) │ 100.00%     │
│ 50        │ 470         │ 470 (100.00%) │ 470 (100.00%) │ 100.00%     │
│ 100       │ 884         │ 884 (100.00%) │ 884 (100.00%) │ 100.00%     │
└───────────┴─────────────┴───────────────┴───────────────┴─────────────┘

Keydown Latency (ms):
┌───────────┬───────┬───────┬────────┬───────────┬───────────┬───────┐
│ Rate (/s) │ Min   │ Avg   │ Median │ 95th %ile │ 99th %ile │ Max   │
├───────────┼───────┼───────┼────────┼───────────┼───────────┼───────┤
│ 5         │ 0.584 │ 0.737 │ 0.729  │ 0.918     │ 1.001     │ 1.001 │
│ 10        │ 0.553 │ 0.757 │ 0.718  │ 1.104     │ 1.423     │ 1.423 │
│ 20        │ 0.504 │ 0.750 │ 0.699  │ 1.035     │ 1.371     │ 1.732 │
│ 50        │ 0.485 │ 0.686 │ 0.658  │ 0.929     │ 1.130     │ 1.462 │
│ 100       │ 0.428 │ 0.659 │ 0.625  │ 0.890     │ 1.095     │ 1.537 │
└───────────┴───────┴───────┴────────┴───────────┴───────────┴───────┘

Keyup Latency (ms):
┌───────────┬───────┬───────┬────────┬───────────┬───────────┬───────┐
│ Rate (/s) │ Min   │ Avg   │ Median │ 95th %ile │ 99th %ile │ Max   │
├───────────┼───────┼───────┼────────┼───────────┼───────────┼───────┤
│ 5         │ 0.172 │ 0.214 │ 0.198  │ 0.281     │ 0.381     │ 0.381 │
│ 10        │ 0.157 │ 0.218 │ 0.213  │ 0.276     │ 0.416     │ 0.416 │
│ 20        │ 0.133 │ 0.192 │ 0.180  │ 0.283     │ 0.448     │ 0.478 │
│ 50        │ 0.090 │ 0.152 │ 0.148  │ 0.207     │ 0.239     │ 0.274 │
│ 100       │ 0.083 │ 0.133 │ 0.129  │ 0.180     │ 0.211     │ 0.286 │
└───────────┴───────┴───────┴────────┴───────────┴───────────┴───────┘
```

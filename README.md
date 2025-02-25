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
    /** Message type (e.g., WM_KEYDOWN = 0x0100). */
    message: number;
}

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends EventTarget {
    /** Starts monitoring of keyboard events. */
    start(): void;

    /** Stops monitoring of keyboard events. */
    stop(): void;

    /** Strictly typed addEventListener. */
    addEventListener(
        type: "keydown" | "keyup" | "syskeydown" | "syskeyup" | "key",
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
deno run --allow-ffi --allow-read .\benchmarks\keyhold.ts
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
│ 1000          │ 0.033 │ 0.063 │ 0.054  │ 0.051 │ 0.088     │ 0.509     │ 0.554 │
│ 2000          │ 0.031 │ 0.043 │ 0.037  │ 0.042 │ 0.058     │ 0.088     │ 0.767 │
│ 5000          │ 0.030 │ 0.040 │ 0.036  │ 0.028 │ 0.058     │ 0.075     │ 0.873 │
│ 10000         │ 0.030 │ 0.043 │ 0.039  │ 0.022 │ 0.063     │ 0.082     │ 0.721 │
└───────────────┴───────┴───────┴────────┴───────┴───────────┴───────────┴───────┘
```

### Keypress

```bash
deno run --allow-ffi --allow-read .\benchmarks\keypress.ts
```

```
Basic Information:
┌───────────┬─────────────┬───────────────┬───────────────┬─────────────┐
│ Rate (/s) │ Key Presses │ Keydowns (%)  │ Keyups (%)    │ Success (%) │
├───────────┼─────────────┼───────────────┼───────────────┼─────────────┤
│ 5         │ 48          │ 48 (100.00%)  │ 48 (100.00%)  │ 100.00%     │
│ 10        │ 98          │ 98 (100.00%)  │ 98 (100.00%)  │ 100.00%     │
│ 20        │ 194         │ 194 (100.00%) │ 194 (100.00%) │ 100.00%     │
│ 50        │ 469         │ 469 (100.00%) │ 469 (100.00%) │ 100.00%     │
│ 100       │ 885         │ 885 (100.00%) │ 885 (100.00%) │ 100.00%     │
└───────────┴─────────────┴───────────────┴───────────────┴─────────────┘

Keydown Latency (ms):
┌───────────┬───────┬───────┬────────┬───────────┬───────────┬───────┐
│ Rate (/s) │ Min   │ Avg   │ Median │ 95th %ile │ 99th %ile │ Max   │
├───────────┼───────┼───────┼────────┼───────────┼───────────┼───────┤
│ 5         │ 0.590 │ 0.787 │ 0.735  │ 1.142     │ 1.504     │ 1.504 │
│ 10        │ 0.553 │ 0.745 │ 0.724  │ 1.006     │ 1.392     │ 1.392 │
│ 20        │ 0.499 │ 0.703 │ 0.670  │ 0.957     │ 1.207     │ 1.266 │
│ 50        │ 0.443 │ 0.672 │ 0.641  │ 0.897     │ 1.068     │ 1.404 │
│ 100       │ 0.450 │ 0.642 │ 0.609  │ 0.879     │ 1.132     │ 1.262 │
└───────────┴───────┴───────┴────────┴───────────┴───────────┴───────┘

Keyup Latency (ms):
┌───────────┬───────┬───────┬────────┬───────────┬───────────┬───────┐
│ Rate (/s) │ Min   │ Avg   │ Median │ 95th %ile │ 99th %ile │ Max   │
├───────────┼───────┼───────┼────────┼───────────┼───────────┼───────┤
│ 5         │ 0.165 │ 0.210 │ 0.201  │ 0.271     │ 0.384     │ 0.384 │
│ 10        │ 0.153 │ 0.213 │ 0.209  │ 0.265     │ 0.321     │ 0.321 │
│ 20        │ 0.127 │ 0.183 │ 0.173  │ 0.239     │ 0.426     │ 0.595 │
│ 50        │ 0.090 │ 0.148 │ 0.143  │ 0.199     │ 0.249     │ 0.281 │
│ 100       │ 0.085 │ 0.126 │ 0.120  │ 0.175     │ 0.217     │ 0.376 │
└───────────┴───────┴───────┴────────┴───────────┴───────────┴───────┘
```

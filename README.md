# keyboard-hook

[![JSR](https://jsr.io/badges/@nktkas/keyboard-hook)](https://jsr.io/@nktkas/keyboard-hook)

Library for listening to global keyboard press events.

## Features

- Written for [Deno](https://deno.com) + Windows 11 x64.
- Uses native user32.dll, so no external modules are needed.
- Launches the [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) to ensure that interaction
  with user32.dll does not block the main loop.

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

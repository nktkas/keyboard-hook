# keyboard-hook

[![JSR](https://jsr.io/badges/@nktkas/keyboard-hook)](https://jsr.io/@nktkas/keyboard-hook)

Windows keyboard listening for Deno with zero dependencies.

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

// When done, clean up resources
// hook.close();
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
}

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends EventTarget {
    /** Stops the keyboard hook and cleans up resources. */
    close(): void;

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
    Space: 0x0039,
    PageUp: 0x0E49,
    PageDown: 0x0E51,
    End: 0x0E4F,
    Home: 0x0E47,
    ArrowLeft: 0xE04B,
    ArrowUp: 0xE048,
    ArrowRight: 0xE04D,
    ArrowDown: 0xE050,
    Insert: 0x0E52,
    Delete: 0x0E53,
    0: 0x000B,
    1: 0x0002,
    2: 0x0003,
    3: 0x0004,
    4: 0x0005,
    5: 0x0006,
    6: 0x0007,
    7: 0x0008,
    8: 0x0009,
    9: 0x000A,
    A: 0x001E,
    B: 0x0030,
    C: 0x002E,
    D: 0x0020,
    E: 0x0012,
    F: 0x0021,
    G: 0x0022,
    H: 0x0023,
    I: 0x0017,
    J: 0x0024,
    K: 0x0025,
    L: 0x0026,
    M: 0x0032,
    N: 0x0031,
    O: 0x0018,
    P: 0x0019,
    Q: 0x0010,
    R: 0x0013,
    S: 0x001F,
    T: 0x0014,
    U: 0x0016,
    V: 0x002F,
    W: 0x0011,
    X: 0x002D,
    Y: 0x0015,
    Z: 0x002C,
    Numpad0: 0x0052,
    Numpad1: 0x004F,
    Numpad2: 0x0050,
    Numpad3: 0x0051,
    Numpad4: 0x004B,
    Numpad5: 0x004C,
    Numpad6: 0x004D,
    Numpad7: 0x0047,
    Numpad8: 0x0048,
    Numpad9: 0x0049,
    NumpadMultiply: 0x0037,
    NumpadAdd: 0x004E,
    NumpadSubtract: 0x004A,
    NumpadDecimal: 0x0053,
    NumpadDivide: 0x0E35,
    NumpadEnter: 0x0E00 | 0x001C,
    NumpadEnd: 0xEE00 | 0x004F,
    NumpadArrowDown: 0xEE00 | 0x0050,
    NumpadPageDown: 0xEE00 | 0x0051,
    NumpadArrowLeft: 0xEE00 | 0x004B,
    NumpadArrowRight: 0xEE00 | 0x004D,
    NumpadHome: 0xEE00 | 0x0047,
    NumpadArrowUp: 0xEE00 | 0x0048,
    NumpadPageUp: 0xEE00 | 0x0049,
    NumpadInsert: 0xEE00 | 0x0052,
    NumpadDelete: 0xEE00 | 0x0053,
    F1: 0x003B,
    F2: 0x003C,
    F3: 0x003D,
    F4: 0x003E,
    F5: 0x003F,
    F6: 0x0040,
    F7: 0x0041,
    F8: 0x0042,
    F9: 0x0043,
    F10: 0x0044,
    F11: 0x0057,
    F12: 0x0058,
    F13: 0x005B,
    F14: 0x005C,
    F15: 0x005D,
    F16: 0x0063,
    F17: 0x0064,
    F18: 0x0065,
    F19: 0x0066,
    F20: 0x0067,
    F21: 0x0068,
    F22: 0x0069,
    F23: 0x006A,
    F24: 0x006B,
    Semicolon: 0x0027,
    Equal: 0x000D,
    Comma: 0x0033,
    Minus: 0x000C,
    Period: 0x0034,
    Slash: 0x0035,
    Backquote: 0x0029,
    BracketLeft: 0x001A,
    Backslash: 0x002B,
    BracketRight: 0x001B,
    Quote: 0x0028,
    Ctrl: 0x001D,
    CtrlRight: 0x0E1D,
    Alt: 0x0038,
    AltRight: 0x0E38,
    Shift: 0x002A,
    ShiftRight: 0x0036,
    Meta: 0x0E5B,
    MetaRight: 0x0E5C,
    NumLock: 0x0045,
    ScrollLock: 0x0046,
    PrintScreen: 0x0E37,
};
```

## Benchmarks

### Keyhold

```bash
deno run --allow-ffi .\benchmarks\keyhold.ts
```

```
Emit to Receive Latency (ms):
┌───────────────┬───────┬───────┬────────┬───────┬───────────┬───────────┬───────┐
│ Duration (ms) │ Min   │ Avg   │ Median │ Stdev │ 95th %ile │ 99th %ile │ Max   │
├───────────────┼───────┼───────┼────────┼───────┼───────────┼───────────┼───────┤
│ 1000          │ 0.026 │ 0.044 │ 0.037  │ 0.028 │ 0.061     │ 0.238     │ 0.303 │
│ 2000          │ 0.025 │ 0.035 │ 0.029  │ 0.018 │ 0.048     │ 0.060     │ 0.269 │
│ 5000          │ 0.024 │ 0.033 │ 0.027  │ 0.017 │ 0.047     │ 0.054     │ 0.485 │
│ 10000         │ 0.024 │ 0.034 │ 0.029  │ 0.012 │ 0.048     │ 0.058     │ 0.429 │
└───────────────┴───────┴───────┴────────┴───────┴───────────┴───────────┴───────┘
```

### Keypress

```bash
deno run --allow-ffi .\benchmarks\keypress.ts
```

```
Keydown Latency (ms):
┌───────────┬───────┬───────┬────────┬───────────┬───────────┬───────┐
│ Rate (/s) │ Min   │ Avg   │ Median │ 95th %ile │ 99th %ile │ Max   │
├───────────┼───────┼───────┼────────┼───────────┼───────────┼───────┤
│ 5         │ 0.317 │ 0.460 │ 0.439  │ 0.648     │ 0.682     │ 0.682 │
│ 10        │ 0.285 │ 0.513 │ 0.518  │ 0.685     │ 0.829     │ 0.829 │
│ 20        │ 0.256 │ 0.504 │ 0.535  │ 0.699     │ 0.801     │ 0.833 │
│ 50        │ 0.227 │ 0.362 │ 0.323  │ 0.591     │ 0.685     │ 0.812 │
│ 100       │ 0.212 │ 0.322 │ 0.302  │ 0.501     │ 0.620     │ 0.679 │
└───────────┴───────┴───────┴────────┴───────────┴───────────┴───────┘

Keyup Latency (ms):
┌───────────┬───────┬───────┬────────┬───────────┬───────────┬───────┐
│ Rate (/s) │ Min   │ Avg   │ Median │ 95th %ile │ 99th %ile │ Max   │
├───────────┼───────┼───────┼────────┼───────────┼───────────┼───────┤
│ 5         │ 0.154 │ 0.217 │ 0.206  │ 0.301     │ 0.428     │ 0.428 │
│ 10        │ 0.140 │ 0.291 │ 0.270  │ 0.462     │ 0.611     │ 0.611 │
│ 20        │ 0.117 │ 0.279 │ 0.250  │ 0.475     │ 0.578     │ 0.588 │
│ 50        │ 0.082 │ 0.173 │ 0.140  │ 0.394     │ 0.474     │ 0.515 │
│ 100       │ 0.080 │ 0.130 │ 0.118  │ 0.186     │ 0.415     │ 0.514 │
└───────────┴───────┴───────┴────────┴───────────┴───────────┴───────┘
```

## Related

[`@nktkas/mouse-hook`](https://github.com/nktkas/mouse-hook) - Windows mouse listening for Deno with zero dependencies.

[`@nktkas/windows-screenshot`](https://github.com/nktkas/windows-screenshot) - Windows screen capture for Deno with zero
dependencies.

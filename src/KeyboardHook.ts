import { TypedEventTarget } from "@derzade/typescript-event-target";

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

/** Event map for the {@linkcode KeyboardHook} class. */
export interface KeyboardHookEventMap {
    keydown: CustomEvent<KeyEvent>;
    keyup: CustomEvent<KeyEvent>;
    syskeydown: CustomEvent<KeyEvent>;
    syskeyup: CustomEvent<KeyEvent>;
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
    Ctrl: 0x001D, // Left
    CtrlRight: 0x0E1D,
    Alt: 0x0038, // Left
    AltRight: 0x0E38,
    Shift: 0x002A, // Left
    ShiftRight: 0x0036,
    Meta: 0x0E5B,
    MetaRight: 0x0E5C,
    NumLock: 0x0045,
    ScrollLock: 0x0046,
    PrintScreen: 0x0E37,
} as const;

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends TypedEventTarget<KeyboardHookEventMap> {
    private static readonly WH_KEYBOARD_LL = 13;
    private static readonly WM_KEYDOWN = 0x0100;
    private static readonly WM_KEYUP = 0x0101;
    private static readonly WM_SYSKEYDOWN = 0x0104;
    private static readonly WM_SYSKEYUP = 0x0105;

    private static readonly eventNameMap: Map<number, keyof KeyboardHookEventMap> = new Map([
        [KeyboardHook.WM_KEYDOWN, "keydown"],
        [KeyboardHook.WM_KEYUP, "keyup"],
        [KeyboardHook.WM_SYSKEYDOWN, "syskeydown"],
        [KeyboardHook.WM_SYSKEYUP, "syskeyup"],
    ]);

    private readonly user32 = Deno.dlopen("user32.dll", {
        /**
         * Installs an application-defined hook procedure into a hook chain.
         * You would install a hook procedure to monitor the system for certain types of events.
         * These events are associated either with a specific thread or with all threads in the same desktop as the calling thread.
         * @param {int} idHook [in] The type of hook procedure to be installed.
         * @param {HOOKPROC} lpfn [in] A pointer to the hook procedure.
         * @param {HINSTANCE} hmod [in] A handle to the DLL containing the hook procedure pointed to by the lpfn parameter.
         * @param {DWORD} dwThreadId [in] The identifier of the thread with which the hook procedure is to be associated.
         * @returns {HHOOK} If the function succeeds, the return value is the handle to the hook procedure.
         * @link https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowshookexw
         */
        SetWindowsHookExW: {
            parameters: ["i32", "pointer", "pointer", "u32"],
            result: "pointer",
        },
        /**
         * Passes the hook information to the next hook procedure in the current hook chain.
         * A hook procedure can call this function either before or after processing the hook information.
         * @param {HHOOK} hhk [in, optional] This parameter is ignored.
         * @param {int} nCode [in] The hook code passed to the current hook procedure.
         * @param {WPARAM} wParam [in] The wParam value passed to the current hook procedure.
         * @param {LPARAM} lParam [in] The lParam value passed to the current hook procedure.
         * @returns {LRESULT} This value is returned by the next hook procedure in the chain.
         * @link https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-callnexthookex
         */
        CallNextHookEx: {
            parameters: ["pointer", "i32", "u32", "pointer"],
            result: "i32",
        },
        /**
         * Retrieves a message from the calling thread's message queue.
         * The function dispatches incoming sent messages until a posted message is available for retrieval.
         * @param {LPMSG} lpMsg [out] A pointer to an MSG structure that receives message information from the thread's message queue.
         * @param {HWND} hWnd [in, optional] A handle to the window whose messages are to be retrieved.
         * @param {UINT} wMsgFilterMin [in] The integer value of the lowest message value to be retrieved.
         * @param {UINT} wMsgFilterMax [in] The integer value of the highest message value to be retrieved.
         * @returns {int} If the function retrieves a message other than WM_QUIT, the return value is nonzero.
         * @link https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getmessagew
         */
        GetMessageW: {
            parameters: ["pointer", "pointer", "u32", "u32"],
            result: "i32",
        },
        /**
         * Indicates to the system that a thread has made a request to terminate (quit).
         * It is typically used in response to a WM_DESTROY message.
         * @param {int} nExitCode [in] The application exit code.
         * @returns {void} This function does not return a value.
         * @link https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-postquitmessage
         */
        PostQuitMessage: {
            parameters: ["i32"],
            result: "void",
        },
        /**
         * Removes a hook procedure installed in a hook chain by the SetWindowsHookEx function.
         * @param {HHOOK} hhk [in] A handle to the hook to be removed.
         * @returns {BOOL} If the function succeeds, the return value is nonzero.
         * @link https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-unhookwindowshookex
         */
        UnhookWindowsHookEx: {
            parameters: ["pointer"],
            result: "i32",
        },
    });

    private readonly callback: Deno.UnsafeCallback<{ parameters: ["i32", "u32", "pointer"]; result: "i32" }>;
    private readonly hookHandle: Deno.PointerObject;

    constructor() {
        super();

        this.callback = Deno.UnsafeCallback.threadSafe(
            { parameters: ["i32", "u32", "pointer"], result: "i32" },
            (nCode, wParam, lParam) => {
                if (nCode >= 0 && lParam !== null) {
                    const eventName = KeyboardHook.eventNameMap.get(wParam);
                    if (eventName) {
                        const view = new Deno.UnsafePointerView(lParam);
                        // KBDLLHOOKSTRUCT structure:
                        // https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-kbdllhookstruct
                        this.dispatchEvent(
                            new CustomEvent(eventName, {
                                detail: {
                                    // First DWORD (32-bit) value is the virtual key code
                                    vkCode: view.getUint32(0),
                                    // Second DWORD is the hardware scan code
                                    scanCode: view.getUint32(4),
                                    // Third DWORD contains various flags about key state
                                    flags: view.getUint32(8),
                                    // Fourth DWORD is the timestamp of the event
                                    time: view.getUint32(12),
                                },
                            }),
                        );
                    }
                }
                return this.user32.symbols.CallNextHookEx(null, nCode, wParam, lParam);
            },
        );

        const hookHandle = this.user32.symbols.SetWindowsHookExW(
            KeyboardHook.WH_KEYBOARD_LL,
            this.callback.pointer,
            null,
            0,
        );
        if (hookHandle === null) {
            this.close();
            throw new Error("Failed to install keyboard hook");
        }
        this.hookHandle = hookHandle;

        this.user32.symbols.GetMessageW(Deno.UnsafePointer.of(new Uint8Array(48)), null, 0, 0);
    }

    /** Closes the keyboard hook and releases resources. */
    close(): void {
        this.user32.symbols.PostQuitMessage(0);
        this.user32.symbols.UnhookWindowsHookEx(this.hookHandle);
        this.callback.close();
        this.user32.close();
    }
}

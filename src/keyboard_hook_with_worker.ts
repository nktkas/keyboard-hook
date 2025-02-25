import { TypedEventTarget } from "@derzade/typescript-event-target";
import type { KeyboardHookEventMap } from "./keyboard_hook.ts";

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends TypedEventTarget<KeyboardHookEventMap> {
    private worker: Worker | undefined;

    /** Starts monitoring of keyboard events. */
    public start(): void {
        if (this.worker) return;

        // Full worker code with all keyboard hook implementation inlined
        // This completely avoids any imports or file reading
        const workerCode = `
// —————————— Keyboard Hook ——————————

const WH_KEYBOARD_LL = 13;
const WM_KEYDOWN = 0x0100;
const WM_KEYUP = 0x0101;
const WM_SYSKEYDOWN = 0x0104;
const WM_SYSKEYUP = 0x0105;

const user32Symbols = {
    SetWindowsHookExW: {
        parameters: ["i32", "pointer", "pointer", "u32"],
        result: "pointer",
    },
    CallNextHookEx: {
        parameters: ["pointer", "i32", "u64", "pointer"],
        result: "i32",
    },
    GetMessageW: {
        parameters: ["pointer", "pointer", "u32", "u32"],
        result: "i32",
    },
    PeekMessageW: {
        parameters: ["pointer", "pointer", "u32", "u32", "u32"],
        result: "i32",
    },
    UnhookWindowsHookEx: {
        parameters: ["pointer"],
        result: "i32",
    },
    PostQuitMessage: {
        parameters: ["i32"],
        result: "void",
    },
};

const callbackDefinition = {
    parameters: ["i32", "u64", "pointer"],
    result: "i32",
};

class KeyboardHook extends EventTarget {
    #hookHandle;
    #callback;
    #user32;
    #msgPtr;
    #running = false;

    constructor() {
        super();
        this.#user32 = Deno.dlopen("user32.dll", user32Symbols);
        this.#msgPtr = Deno.UnsafePointer.of(new Uint8Array(48));
    }

    start() {
        if (this.#running) return;
        this.#running = true;

        this.#callback = new Deno.UnsafeCallback(callbackDefinition, (nCode, wParam, lParam) => {
            if (nCode === 0 && lParam !== null) {
                const keyEvent = this.#parseKeyEvent(wParam, lParam);
                const eventName = this.#getEventName(keyEvent.message);
                this.dispatchEvent(new CustomEvent(eventName, { detail: keyEvent }));
            }
            return this.#user32.symbols.CallNextHookEx(null, nCode, wParam, lParam);
        });

        this.#hookHandle = this.#user32.symbols.SetWindowsHookExW(WH_KEYBOARD_LL, this.#callback.pointer, null, 0);

        if (!this.#hookHandle) {
            this.#running = false;
            this.#callback.close();
            throw new Error("Failed to install the hook.");
        }

        while (this.#running) {
            this.#user32.symbols.GetMessageW(this.#msgPtr, null, 0, 0);
        }
    }

    stop() {
        if (!this.#running) return;
        this.#running = false;

        this.#user32.symbols.PostQuitMessage(0);

        if (this.#hookHandle) {
            this.#user32.symbols.UnhookWindowsHookEx(this.#hookHandle);
            this.#hookHandle = undefined;
        }

        if (this.#callback) {
            this.#callback.close();
            this.#callback = undefined;
        }

        this.#user32.close();
    }

    #parseKeyEvent(wParam, lParam) {
        const view = new Deno.UnsafePointerView(lParam);
        return {
            vkCode: view.getUint32(0),
            scanCode: view.getUint32(4),
            flags: view.getUint32(8),
            time: view.getUint32(12),
            extraInfo: view.getBigUint64(16),
            message: Number(wParam),
        };
    }

    #getEventName(message) {
        switch (message) {
            case WM_KEYDOWN:
                return "keydown";
            case WM_KEYUP:
                return "keyup";
            case WM_SYSKEYDOWN:
                return "syskeydown";
            case WM_SYSKEYUP:
                return "syskeyup";
            default:
                return "key";
        }
    }
}

// —————————— Worker ——————————

const hook = new KeyboardHook();
hook.addEventListener("keydown", (event) => {
    self.postMessage({ type: "keydown", detail: event.detail });
});
hook.addEventListener("keyup", (event) => {
    self.postMessage({ type: "keyup", detail: event.detail });
});
hook.addEventListener("syskeydown", (event) => {
    self.postMessage({ type: "syskeydown", detail: event.detail });
});
hook.addEventListener("syskeyup", (event) => {
    self.postMessage({ type: "syskeyup", detail: event.detail });
});
hook.addEventListener("key", (event) => {
    self.postMessage({ type: "key", detail: event.detail });
});
hook.start();
`;

        // Create a blob URL from the worker code
        const blob = new Blob([workerCode], { type: "application/javascript" });
        const blobURL = URL.createObjectURL(blob);

        // Create the worker from the blob URL
        this.worker = new Worker(blobURL, { type: "module" });

        // Forward events from the worker to this event target
        this.worker.onmessage = (event) => {
            const { type, detail } = event.data;
            this.dispatchEvent(new CustomEvent(type, { detail }));
        };

        // Clean up the blob URL when it's no longer needed
        URL.revokeObjectURL(blobURL);
    }

    /** Stops monitoring of keyboard events. */
    public stop(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = undefined;
        }
    }
}

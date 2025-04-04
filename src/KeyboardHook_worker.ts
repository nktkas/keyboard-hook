import { TypedEventTarget } from "@derzade/typescript-event-target";
import type { KeyboardHookEventMap } from "./KeyboardHook.ts";

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends TypedEventTarget<KeyboardHookEventMap> {
    private readonly worker: Worker;

    constructor() {
        super();

        // Full worker code with all keyboard hook implementation inlined
        // This completely avoids any imports or file reading
        const workerCode = `
// —————————— Keyboard Hook ——————————

const KeyboardEventNameMap = {
    0x0100: "keydown",
    0x0101: "keyup",
    0x0104: "syskeydown",
    0x0105: "syskeyup",
};

class KeyboardHook extends EventTarget {
    #user32;
    constructor() {
        super();
        this.#user32 = Deno.dlopen("user32.dll", {
            SetWindowsHookExW: { parameters: ["i32", "pointer", "pointer", "u32"], result: "pointer" },
            CallNextHookEx: { parameters: ["pointer", "i32", "u32", "pointer"], result: "i32" },
            GetMessageW: { parameters: ["pointer", "pointer", "u32", "u32"], result: "i32" },
        });
    }
    start() {
        const callback = Deno.UnsafeCallback.threadSafe(
            { parameters: ["i32", "u32", "pointer"], result: "i32" },
            (nCode, wParam, lParam) => {
                if (nCode >= 0 && lParam !== null) {
                    const eventName = KeyboardEventNameMap[wParam];
                    if (eventName) {
                        const view = new Deno.UnsafePointerView(lParam);
                        const flags = view.getUint32(8);
                        this.dispatchEvent(
                            new CustomEvent(eventName, {
                                detail: {
                                    vkCode: view.getUint32(0),
                                    scanCode: view.getUint32(4),
                                    flags: {
                                        extended: (flags & 0x01) !== 0,
                                        lowerIlInjected: (flags & 0x02) !== 0,
                                        injected: (flags & 0x10) !== 0,
                                        altDown: (flags & 0x20) !== 0,
                                        up: (flags & 0x80) !== 0,
                                    },
                                    time: view.getUint32(12),
                                },
                            }),
                        );
                    }
                }
                return this.#user32.symbols.CallNextHookEx(null, nCode, wParam, lParam);
            },
        );
        if (!this.#user32.symbols.SetWindowsHookExW(13, callback.pointer, null, 0)) {
            callback.close();
            this.#user32.close();
            self.close();
        }
        this.#user32.symbols.GetMessageW(Deno.UnsafePointer.of(new Uint8Array(48)), null, 0, 0);
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

    /** Closes the keyboard hook and releases resources. */
    close(): void {
        this.worker.terminate();
    }
}

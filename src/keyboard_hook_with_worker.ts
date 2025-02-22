import { TypedEventTarget } from "@derzade/typescript-event-target";
import type { KeyboardHookEventMap, KeyEvent } from "./keyboard_hook.ts";

/** A class to hook into keyboard events on Windows. */
export class KeyboardHook extends TypedEventTarget<KeyboardHookEventMap> {
    private worker: Worker | undefined;

    /** Starts monitoring of keyboard events. */
    public start(): void {
        if (this.worker) return;
        this.worker = new Worker(import.meta.resolve("./worker.ts"), { type: "module" });
        this.worker.onmessage = (event: MessageEvent<{ type: keyof KeyboardHookEventMap; detail: KeyEvent }>) => {
            const { type, detail } = event.data;
            this.dispatchEvent(new CustomEvent(type, { detail }));
        };
    }

    /** Stops monitoring of keyboard events. */
    public stop(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = undefined;
        }
    }
}

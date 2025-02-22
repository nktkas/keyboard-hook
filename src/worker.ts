/// <reference lib="deno.worker" />

import { KeyboardHook } from "./keyboard_hook.ts";

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

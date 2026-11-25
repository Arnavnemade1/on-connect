// A tiny event bus between local storage writes and the (optional) cloud sync. Safe to import anywhere; does nothing on the server.
export const WRITE = "onc:write", REMOTE = "onc:remote";
export const notifyWrite = (key: string) => { try { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(WRITE, { detail: { key } })); } catch {} };
export const notifyRemote = (key: string) => { try { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(REMOTE, { detail: { key } })); } catch {} };

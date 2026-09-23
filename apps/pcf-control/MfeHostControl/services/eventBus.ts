import { Subject } from "rxjs";
import { MfeLoadStatus, MfeManifest } from "./types";

/**
 * All app-level events flow through one Subject as a discriminated union,
 * rather than each event type getting its own ad-hoc callback prop threaded
 * through every layer. Adding a new consumer (a second telemetry backend, a
 * debug console, a future "activity log" panel) means subscribing to this
 * bus, not touching every producer. Producers (RemoteSlot, App) don't know
 * or care who's listening.
 */
export type AppEvent =
  | {
      type: "mfe_load";
      which: 1 | 2;
      status: MfeLoadStatus;
      manifest?: MfeManifest;
      error?: string;
    }
  | {
      type: "widget_crash";
      which: 1 | 2;
      message: string;
    }
  | {
      type: "shared_value_change";
      value: string;
      source: "host" | "mfe1" | "mfe2";
    };

/**
 * One event bus per control instance (created in index.ts's constructor and
 * handed down via props) -- deliberately NOT a module-level singleton.
 * Multiple instances of this control can exist on one page (e.g. the same
 * field control rendered on several form tabs, or a grid with repeated
 * cells); a singleton bus would cross-talk events between them.
 */
export function createEventBus(): Subject<AppEvent> {
  return new Subject<AppEvent>();
}

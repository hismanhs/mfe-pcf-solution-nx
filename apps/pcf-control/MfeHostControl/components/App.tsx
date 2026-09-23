import * as React from "react";
import { BehaviorSubject, Subject } from "rxjs";
import { SharedValuePanel } from "./SharedValuePanel";
import { RemoteSlot } from "./RemoteSlot";
import { TabHeader, ActiveTab } from "./TabHeader";
import { useRxValue } from "../hooks/useRxValue";
import { AppEvent } from "../services/eventBus";

export interface RemoteConfig {
  mfeUrl: string;
  remoteName: string;
  exposedModule: string;
}

export interface AppProps {
  mfe1: RemoteConfig;
  mfe2: RemoteConfig;
  allowVersionMismatch: boolean;
  widgetProps?: Record<string, unknown>;
  /** Whatever context.parameters.sharedValue.raw currently is, as seen by the most recent updateView(). */
  platformSharedValue: string;
  /** Single source of truth for the shared value; see hooks/useRxValue.ts. */
  sharedValueSubject: BehaviorSubject<string>;
  /** Per-instance event bus; RemoteSlot pushes load/crash events, this component pushes value-change events. */
  events: Subject<AppEvent>;
}

export const App: React.FC<AppProps> = (props) => {
  const { mfe1, mfe2, allowVersionMismatch, widgetProps, platformSharedValue, sharedValueSubject, events } = props;
  const [sharedValue, setSharedValue] = useRxValue(sharedValueSubject);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("transformation");

  // Reconciling a genuinely external platform change (the bound field
  // changed from outside this control entirely -- another user, a
  // workflow, the initial load) into the shared subject happens here, in
  // an effect, deliberately NOT in index.ts's updateView(). updateView()
  // runs *during* the platform's own render pass; calling subject.next()
  // synchronously from there would fire every subscriber's setState
  // (including this very component's, from useRxValue) while a different
  // component higher up is still mid-render, which is exactly the
  // "Cannot update a component while rendering a different component"
  // situation React warns about. An effect runs after the commit phase
  // completes, so by the time subject.next() fires here, nothing is
  // mid-render anymore.
  const lastSeenPlatformValue = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (platformSharedValue === lastSeenPlatformValue.current) return;
    lastSeenPlatformValue.current = platformSharedValue;
    if (platformSharedValue !== sharedValueSubject.getValue()) {
      sharedValueSubject.next(platformSharedValue);
    }
  }, [platformSharedValue, sharedValueSubject]);

  // One wrapped handler per source, created once per render but cheap
  // (no subscriptions inside) -- each just writes through the subject
  // (synchronously fanning out to the other two UIs) and separately tags
  // the event bus with who made the edit, for telemetry.
  const makeChangeHandler = React.useCallback(
    (source: "host" | "mfe1" | "mfe2") => (value: string) => {
      setSharedValue(value);
      events.next({ type: "shared_value_change", value, source });
    },
    [setSharedValue, events]
  );

  return (
    <div className="mfe-host-root">
      <SharedValuePanel value={sharedValue} onChange={makeChangeHandler("host")} />

      <TabHeader active={activeTab} onChange={setActiveTab} />

      {/*
        Both RemoteSlots are ALWAYS mounted -- only visibility (via a plain
        CSS toggle, not conditional rendering) follows the active tab. This
        is deliberate: unmounting the inactive one on every tab switch
        would (a) throw away its Module Federation load state, forcing a
        re-fetch of its manifest and container every time you switch back,
        and (b) make it impossible to demonstrate that shared-value edits
        made on the hidden tab are still live and already reflected the
        moment you switch to it -- which is the actual point of this demo.
      */}
      <div style={{ display: activeTab === "transformation" ? "block" : "none" }}>
        <RemoteSlot
          label="MFE 1 — Message Transformation"
          opts={{ ...mfe1, allowVersionMismatch }}
          widgetProps={{ ...(widgetProps ?? {}), sharedValue, onSharedValueChange: makeChangeHandler("mfe1") }}
          events={events}
          which={1}
        />
      </div>

      <div style={{ display: activeTab === "compliance" ? "block" : "none" }}>
        <RemoteSlot
          label="MFE 2 — Compliance Validation"
          opts={{ ...mfe2, allowVersionMismatch }}
          widgetProps={{ ...(widgetProps ?? {}), sharedValue, onSharedValueChange: makeChangeHandler("mfe2") }}
          events={events}
          which={2}
        />
      </div>
    </div>
  );
};

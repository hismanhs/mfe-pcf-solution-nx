import * as React from "react";
import { BehaviorSubject } from "rxjs";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { App } from "./components/App";
import { createEventBus } from "./services/eventBus";
import { initTelemetry, reportEvent } from "./services/telemetry";

export class MfeHostControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  private notifyOutputChanged!: () => void;

  /**
   * Single source of truth for the shared value, for the lifetime of this
   * control instance. React state in App.tsx (via useRxValue) subscribes to
   * this directly, so edits from any of the three UIs propagate to the
   * other two synchronously, in the same tick -- independent of, and much
   * faster than, the async PCF notifyOutputChanged/getOutputs/updateView
   * round trip below, which exists purely to persist the value to whatever
   * the bound property is bound to.
   */
  private sharedValueSubject = new BehaviorSubject<string>("");

  /** Per-instance RxJS event bus -- see services/eventBus.ts for why it's not a singleton. */
  private events = createEventBus();

  /**
   * What we most recently saw in context.parameters.sharedValue.raw, updated
   * as a plain field assignment inside updateView() (safe to do during
   * render -- it has no side effects on any subscriber). Used by the
   * subject subscription below to tell "the platform just told us about a
   * value that originated from the platform" apart from "one of the three
   * UIs just made a genuinely new local edit" -- only the latter should
   * trigger notifyOutputChanged().
   */
  private knownPlatformValue: string | undefined;

  /** Holds the next value to hand back from getOutputs() once we have a pending edit. */
  private pendingSharedValue: string | undefined;

  /**
   * init runs once when the control is first constructed.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
    context.mode.trackContainerResize(true);

    // Whenever the shared value changes -- from the host panel, MFE 1, or
    // MFE 2, it doesn't matter which -- push it out through PCF's bound-
    // property pipeline so it actually persists (e.g. to a Dataverse column),
    // not just lives in this session's memory.
    this.sharedValueSubject.subscribe((value) => {
      if (value === this.knownPlatformValue) return; // this value originated from the platform itself; nothing new to persist
      this.pendingSharedValue = value;
      this.notifyOutputChanged();
    });

    // Telemetry is entirely optional and never blocks anything -- see
    // services/telemetry.ts. Reads config once at init time since these are
    // input (config) properties, not expected to change at runtime.
    initTelemetry({
      accountId: context.parameters.newRelicAccountId.raw ?? "",
      licenseKey: context.parameters.newRelicLicenseKey.raw ?? "",
      applicationId: context.parameters.newRelicApplicationId.raw ?? "",
    });
    this.events.subscribe((event) => reportEvent(event));
  }

  /**
   * updateView runs on every re-render (input change, resize, etc.) and
   * returns the React element to mount. This is the "virtual" control
   * pattern: PCF attaches this element to the *platform's* React tree
   * instead of giving us a raw HTMLDivElement to manage ourselves.
   */
  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    const widgetPropsRaw = context.parameters.widgetProps?.raw;
    let widgetProps: Record<string, unknown> | undefined;
    if (widgetPropsRaw && /^\s*\{/.test(widgetPropsRaw)) {
      try {
        widgetProps = JSON.parse(widgetPropsRaw);
      } catch {
        // eslint-disable-next-line no-console
        console.warn("[MfeHostControl] widgetProps looked like JSON but failed to parse, ignoring.");
      }
    }

    // Record what the platform currently has (a plain field assignment --
    // safe during render, no subscriber side effects) so the subject
    // subscription in init() can tell a platform-originated value apart
    // from a genuinely new local edit. See the comment on
    // `platformSharedValue` below for why we don't push into the subject
    // here directly.
    this.knownPlatformValue = context.parameters.sharedValue.raw ?? "";

    return React.createElement(App, {
      mfe1: {
        mfeUrl: context.parameters.mfeUrl.raw ?? "",
        remoteName: context.parameters.remoteName.raw ?? "swift_transformation_mfe",
        exposedModule: context.parameters.exposedModule.raw ?? "./Widget",
      },
      mfe2: {
        mfeUrl: context.parameters.mfeUrl2.raw ?? "",
        remoteName: context.parameters.remoteName2.raw ?? "swift_compliance_mfe",
        exposedModule: context.parameters.exposedModule2.raw ?? "./Widget",
      },
      allowVersionMismatch: context.parameters.allowVersionMismatch.raw === true,
      widgetProps,
      platformSharedValue: this.knownPlatformValue,
      sharedValueSubject: this.sharedValueSubject,
      events: this.events,
    });
  }

  /**
   * getOutputs runs after updateView; return any bound output properties here.
   */
  public getOutputs(): IOutputs {
    if (this.pendingSharedValue !== undefined) {
      return { sharedValue: this.pendingSharedValue };
    }
    return {};
  }

  /**
   * destroy runs when the control is removed from the DOM.
   */
  public destroy(): void {
    this.sharedValueSubject.complete();
    this.events.complete();
  }
}

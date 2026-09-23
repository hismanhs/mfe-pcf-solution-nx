import * as React from "react";
import { Subject } from "rxjs";
import { Text } from "@fluentui/react/lib/Text";
import { useMfe } from "../hooks/useMfe";
import { LoadMfeOptions } from "../services/mfeLoader";
import { AppEvent } from "../services/eventBus";
import { StatusPanel } from "./StatusPanel";
import { ErrorBoundary } from "./ErrorBoundary";

export interface RemoteSlotProps {
  label: string;
  which: 1 | 2;
  opts: LoadMfeOptions;
  widgetProps?: Record<string, unknown>;
  events: Subject<AppEvent>;
}

export const RemoteSlot: React.FC<RemoteSlotProps> = ({ label, which, opts, widgetProps, events }) => {
  const { result, retry } = useMfe(opts, (loadResult) => {
    events.next({
      type: "mfe_load",
      which,
      status: loadResult.status,
      manifest: loadResult.manifest,
      error: loadResult.error,
    });
  });
  const [crash, setCrash] = React.useState<string | null>(null);
  const [renderKey, setRenderKey] = React.useState(0);

  // Every genuinely new load result (a fresh mount, a property change, or an
  // explicit retry) clears any prior crash and fully remounts the error
  // boundary below (via the key), so a crash from a previous version of the
  // remote can't linger and mask a working reload.
  React.useEffect(() => {
    setCrash(null);
    setRenderKey((k) => k + 1);
  }, [result]);

  const RemoteComponent = result.Component;
  const effectiveStatus = crash ? "error" : result.status;
  const effectiveError = crash ?? result.error;

  return (
    <div style={{ marginBottom: 16 }}>
      <Text variant="smallPlus" block style={{ fontWeight: 600, marginBottom: 4 }}>
        {label}
      </Text>
      <StatusPanel
        status={effectiveStatus}
        manifest={result.manifest}
        error={effectiveError}
        warnings={result.warnings}
        onRetry={retry}
      />

      {result.status === "ready" && !crash && RemoteComponent && (
        <ErrorBoundary
          key={renderKey}
          onError={(error) => {
            const message = `The remote widget crashed while rendering: ${error.message}`;
            setCrash(message);
            events.next({ type: "widget_crash", which, message });
          }}
          fallback={() => null}
        >
          <React.Suspense fallback={<span>Rendering…</span>}>
            <RemoteComponent {...(widgetProps ?? {})} />
          </React.Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

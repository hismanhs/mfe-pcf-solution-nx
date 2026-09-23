import * as React from "react";
import { loadMfe, LoadMfeOptions } from "../services/mfeLoader";
import { MfeLoadResult } from "../services/types";

const initialResult: MfeLoadResult = { status: "idle", warnings: [] };

/**
 * Loads one remote MFE and keeps its MfeLoadResult in React state, retrying
 * whenever `opts` changes or `retry()` is called. Each call to this hook is
 * fully independent -- two calls (one per remote) load and track two
 * separate MFEs with no shared state between them beyond what the caller
 * explicitly passes down as props.
 */
export function useMfe(
  opts: LoadMfeOptions,
  onResult?: (result: MfeLoadResult) => void
): { result: MfeLoadResult; retry: () => void } {
  const [result, setResult] = React.useState<MfeLoadResult>(initialResult);
  const [attempt, setAttempt] = React.useState(0);
  const onResultRef = React.useRef(onResult);
  onResultRef.current = onResult;

  React.useEffect(() => {
    let cancelled = false;
    setResult({ status: "checking", warnings: [] });

    loadMfe(opts).then((r) => {
      if (cancelled) return;
      setResult(r);
      onResultRef.current?.(r);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.mfeUrl, opts.remoteName, opts.exposedModule, opts.allowVersionMismatch, attempt]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  return { result, retry };
}

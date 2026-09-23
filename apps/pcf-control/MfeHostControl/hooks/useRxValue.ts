import * as React from "react";
import { BehaviorSubject } from "rxjs";

/**
 * Subscribes React state to a BehaviorSubject. Because Subject.next()
 * synchronously invokes every subscriber, calling the returned setter
 * updates every other subscriber of the SAME subject instance (any other
 * component holding a reference to it) within the same tick -- no polling,
 * no waiting on an async round trip. This is what lets the shared value
 * feel instantaneous even though, separately and asynchronously, index.ts
 * also mirrors it out to the PCF bound-property pipeline for persistence.
 */
export function useRxValue<T>(subject: BehaviorSubject<T>): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(subject.getValue());

  React.useEffect(() => {
    // Pick up whatever the subject holds right now (it may have changed
    // between initial useState() and this effect running), then stay
    // subscribed for every subsequent emission.
    setValue(subject.getValue());
    const subscription = subject.subscribe(setValue);
    return () => subscription.unsubscribe();
  }, [subject]);

  const set = React.useCallback((next: T) => subject.next(next), [subject]);

  return [value, set];
}

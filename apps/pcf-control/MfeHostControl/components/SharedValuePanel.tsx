import * as React from "react";
import { TextField } from "@fluentui/react/lib/TextField";
import { Stack } from "@fluentui/react/lib/Stack";
import { Text } from "@fluentui/react/lib/Text";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * The host's own read/write view of the shared value -- proof that "PCF can
 * read and modify it" isn't just a claim about internal plumbing, there's an
 * actual editable field right here in the control's own chrome, backed by
 * the same bound property both remote widgets read and write.
 *
 * Renders `value` directly, with no local buffer: `value` comes from
 * useRxValue(sharedValueSubject) in App.tsx, which updates synchronously
 * (in the same tick) whenever ANY of the three UIs calls the shared
 * subject's setter -- there's no async PCF round trip in this path to lag
 * behind keystrokes. (An earlier version of this component did need a
 * local buffer, back when it rendered the PCF bound-property value
 * directly; see the "Data sharing" section of the README for why that
 * changed.)
 */
export const SharedValuePanel: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Stack
      tokens={{ childrenGap: 4, padding: 8 }}
      style={{ border: "1px solid #d1d1d1", borderRadius: 4, marginBottom: 8 }}
    >
      <Text variant="smallPlus" block style={{ fontWeight: 600 }}>
        Auth token (shared across modules)
      </Text>
      <Text variant="tiny" block style={{ color: "#605e5c" }}>
        This is the single value shared between MFE 1 and MFE 2. MFE 1 writes
        the token after login, and MFE 2 reads it only after authentication.
      </Text>
      <TextField
        value={value}
        onChange={(_, newValue) => onChange(newValue ?? "")}
        placeholder="demo.jwt.eyJ..."
      />
    </Stack>
  );
};

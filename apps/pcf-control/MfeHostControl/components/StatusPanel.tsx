import * as React from "react";
import { MessageBar, MessageBarType } from "@fluentui/react/lib/MessageBar";
import { Spinner, SpinnerSize } from "@fluentui/react/lib/Spinner";
import { DefaultButton } from "@fluentui/react/lib/Button";
import { Stack } from "@fluentui/react/lib/Stack";
import { Text } from "@fluentui/react/lib/Text";
import { MfeLoadStatus, MfeManifest } from "../services/types";

interface Props {
  status: MfeLoadStatus;
  manifest?: MfeManifest;
  error?: string;
  warnings: string[];
  onRetry: () => void;
}

const messageBarTypeByStatus: Partial<Record<MfeLoadStatus, MessageBarType>> = {
  "version-mismatch": MessageBarType.warning,
  error: MessageBarType.error,
};

const labelByStatus: Record<MfeLoadStatus, string> = {
  idle: "Idle",
  checking: "Checking manifest…",
  loading: "Loading micro-frontend…",
  ready: "Loaded",
  "version-mismatch": "Version mismatch — blocked",
  error: "Failed to load",
};

export const StatusPanel: React.FC<Props> = ({ status, manifest, error, warnings, onRetry }) => {
  if (status === "ready") return null;

  // Busy states: lightweight spinner, no MessageBar chrome.
  if (status === "idle" || status === "checking" || status === "loading") {
    return (
      <Stack tokens={{ childrenGap: 8, padding: 8 }}>
        <Spinner size={SpinnerSize.small} label={labelByStatus[status]} ariaLive="polite" labelPosition="right" />
      </Stack>
    );
  }

  const barType = messageBarTypeByStatus[status] ?? MessageBarType.info;

  return (
    <MessageBar
      messageBarType={barType}
      isMultiline={true}
      actions={
        <div>
          <DefaultButton onClick={onRetry} text="Retry" />
        </div>
      }
    >
      <Stack tokens={{ childrenGap: 4 }}>
        <Text variant="mediumPlus" block>
          {labelByStatus[status]}
        </Text>

        {manifest && (
          <Text variant="small" block>
            {manifest.name}@{manifest.version} — requires React {manifest.reactVersion}
          </Text>
        )}

        {error && (
          <Text variant="small" block style={{ fontFamily: "Consolas, monospace" }}>
            {error}
          </Text>
        )}

        {warnings.length > 0 && (
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {warnings.map((w, i) => (
              <li key={i}>
                <Text variant="small">{w}</Text>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </MessageBar>
  );
};

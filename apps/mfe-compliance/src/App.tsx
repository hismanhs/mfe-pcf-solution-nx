import * as React from "react";

export interface WidgetProps {
  title?: string;
  /** Current value of the value shared with MFE 1 (Transformation) and the PCF host -- here used as the message reference. */
  sharedValue?: string;
  /** Call with a new value to write it back through the PCF host. */
  onSharedValueChange?: (value: string) => void;
  [key: string]: unknown;
}

async function protectedApiCall(token: string): Promise<{ status: string; message: string }> {
  const response = await fetch("http://localhost:3000/api/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "The protected API failed.");
  }

  return {
    status: "ok",
    message: `Protected API accepted token for ${result.user?.name || result.user?.email || "authenticated client"}.`,
  };
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #d1d1d1",
  borderRadius: 8,
  padding: 20,
  fontFamily: "Segoe UI, sans-serif",
  borderLeft: "4px solid #d83b01",
  background: "#ffffff",
  maxWidth: 560,
};

/**
 * Exposed remote module ("./Widget"). Demonstrates a compliance-validation
 * step -- another capability a SWIFT modernization platform consolidates
 * (semantic rules per MT category, CBPR+ usage guidelines for MX, BIC
 * directory validation -- see
 * https://www.prowidesoftware.com/solutions/swift-modernization). Mocked
 * checks, not a real rules engine: the point being demonstrated is that
 * this module operates on the exact same message reference the
 * Transformation module (MFE 1) is working with, live, without either
 * module knowing about the other's internals.
 */
const App: React.FC<WidgetProps> = ({
  title = "MFE 2 — Protected API",
  sharedValue = "",
  onSharedValueChange,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [apiResponse, setApiResponse] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");

  const hasToken = Boolean(sharedValue && sharedValue.trim().length > 0);

  const handleSecureCall = async () => {
    if (!hasToken) {
      setError("Not yet logged in. Sign in from MFE 1 first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await protectedApiCall(sharedValue);
      setApiResponse(result.message);
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "The protected API failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#605e5c" }}>
        MFE 2 waits for the auth token. Once MFE 1 logs in, this module can read the token and call the protected API.
      </p>

      {!hasToken ? (
        <div
          style={{
            padding: 16,
            borderRadius: 6,
            border: "1px solid #d1d1d1",
            background: "#f3f2f1",
            color: "#5c5c5c",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Not yet logged in</div>
          <div style={{ fontSize: 14 }}>Please sign in from MFE 1 first. After login, this module will receive the token automatically.</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Token received</div>
          <div
            style={{
              background: "#f8f8f8",
              border: "1px solid #d1d1d1",
              borderRadius: 6,
              padding: 10,
              marginBottom: 16,
              wordBreak: "break-all",
              fontFamily: "Consolas, monospace",
              fontSize: 12,
            }}
          >
            {sharedValue}
          </div>

          <button
            type="button"
            onClick={handleSecureCall}
            disabled={loading}
            style={{
              background: "#d83b01",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "10px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "Calling API..." : "Call protected API"}
          </button>

          {error && (
            <div style={{ color: "#a80000", fontSize: 12, marginTop: 12 }}>{error}</div>
          )}

          {apiResponse && (
            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 6,
                border: "1px solid #d1d1d1",
                background: "#f3f2f1",
                fontSize: 13,
              }}
            >
              {apiResponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;

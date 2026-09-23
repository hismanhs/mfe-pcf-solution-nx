import * as React from "react";

export interface WidgetProps {
  title?: string;
  /** Current value of the value shared with MFE 1 (Transformation) and the PCF host -- here used as the message reference. */
  sharedValue?: string;
  /** Call with a new value to write it back through the PCF host. */
  onSharedValueChange?: (value: string) => void;
  [key: string]: unknown;
}

interface CheckResult {
  label: string;
  detail: string;
  pass: boolean;
}

function runChecks(ref: string): CheckResult[] {
  return [
    { label: "Message reference present", detail: `field 20 / MsgId = "${ref}"`, pass: ref.trim().length > 0 },
    { label: "BIC directory lookup", detail: "BANKGB2LAXXX resolves to a known institution", pass: true },
    { label: "Field 32A amount format", detail: "YYMMDD + 3-letter currency + amount, comma decimal", pass: true },
    { label: "CBPR+ usage guideline (MX)", detail: "Mandatory elements present for pacs.008 / pacs.009", pass: true },
    { label: "Character set validation", detail: "SWIFT X character set, no disallowed characters", pass: ref.length <= 35 },
  ];
}

const box: React.CSSProperties = {
  border: "1px solid #d1d1d1",
  borderRadius: 4,
  padding: "8px 10px",
  marginBottom: 6,
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  fontSize: 13,
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
  title = "Compliance Validation",
  sharedValue = "",
  onSharedValueChange,
}) => {
  const [ranAt, setRanAt] = React.useState<string | null>(null);
  const ref = sharedValue || "REF-DEMO-0001";
  const checks = runChecks(ref);
  const allPass = checks.every((c) => c.pass);

  return (
    <div
      style={{
        border: "1px solid #d1d1d1",
        borderRadius: 6,
        padding: 16,
        fontFamily: "Segoe UI, sans-serif",
        borderLeft: "4px solid #d83b01",
      }}
    >
      <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#a19f9d" }}>
        Illustrative demo -- mocked checks, not a certified rules engine. Rendered
        by <code>mfe-compliance</code>, host React {React.version}.
      </p>

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        Message Reference (field 20 / MsgId -- shared across modules)
      </label>
      <input
        type="text"
        value={sharedValue}
        onChange={(e) => onSharedValueChange?.(e.target.value)}
        placeholder="REF-DEMO-0001"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "6px 8px",
          border: "1px solid #8a8886",
          borderRadius: 4,
          fontSize: 14,
          marginBottom: 12,
        }}
      />

      <button
        type="button"
        onClick={() => setRanAt(new Date().toLocaleTimeString())}
        style={{
          background: "#d83b01",
          color: "white",
          border: "none",
          borderRadius: 4,
          padding: "6px 14px",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Run Validation
      </button>

      {ranAt && (
        <>
          <div style={{ fontSize: 12, color: "#605e5c", marginBottom: 8 }}>
            Last run {ranAt} against reference <strong>{ref}</strong> -- overall:{" "}
            <strong style={{ color: allPass ? "#0b6a0b" : "#a80000" }}>
              {allPass ? "PASS" : "ISSUES FOUND"}
            </strong>
          </div>
          {checks.map((c) => (
            <div key={c.label} style={box}>
              <span style={{ color: c.pass ? "#0b6a0b" : "#a80000", fontWeight: 700 }}>{c.pass ? "\u2713" : "\u2717"}</span>
              <span>
                <strong>{c.label}</strong>
                <br />
                <span style={{ color: "#605e5c" }}>{c.detail}</span>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default App;

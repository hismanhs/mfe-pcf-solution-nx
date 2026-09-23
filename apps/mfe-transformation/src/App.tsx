import * as React from "react";

export interface WidgetProps {
  title?: string;
  /** Current value of the value shared with MFE 2 (Compliance) and the PCF host -- here used as the message reference (SWIFT field 20). */
  sharedValue?: string;
  /** Call with a new value to write it back through the PCF host. */
  onSharedValueChange?: (value: string) => void;
  [key: string]: unknown;
}

type SampleKey = "mt103" | "mt202";

const SAMPLES: Record<SampleKey, { label: string; mt: (ref: string) => string; mx: (ref: string) => string }> = {
  mt103: {
    label: "MT103 -- Single Customer Credit Transfer",
    mt: (ref) =>
      `{1:F01BANKGB2LAXXX0000000000}{2:I103BANKFRPPXXXXN}{4:\n` +
      `:20:${ref}\n` +
      `:23B:CRED\n` +
      `:32A:250131EUR125000,00\n` +
      `:50K:/12345678\nACME TRADING LTD\n1 FINSBURY AVE, LONDON\n` +
      `:59:/FR7630006000011234567890189\nMARTIN SA\n12 RUE DE RIVOLI, PARIS\n` +
      `:71A:SHA\n-}`,
    mx: (ref) =>
      `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">\n` +
      `  <FIToFICstmrCdtTrf>\n` +
      `    <GrpHdr>\n` +
      `      <MsgId>${ref}</MsgId>\n` +
      `      <NbOfTxs>1</NbOfTxs>\n` +
      `    </GrpHdr>\n` +
      `    <CdtTrfTxInf>\n` +
      `      <PmtId><EndToEndId>${ref}</EndToEndId></PmtId>\n` +
      `      <IntrBkSttlmAmt Ccy="EUR">125000.00</IntrBkSttlmAmt>\n` +
      `      <Dbtr><Nm>ACME TRADING LTD</Nm></Dbtr>\n` +
      `      <Cdtr><Nm>MARTIN SA</Nm></Cdtr>\n` +
      `      <ChrgBr>SHAR</ChrgBr>\n` +
      `    </CdtTrfTxInf>\n` +
      `  </FIToFICstmrCdtTrf>\n` +
      `</Document>`,
  },
  mt202: {
    label: "MT202 -- General Financial Institution Transfer",
    mt: (ref) =>
      `{1:F01BANKGB2LAXXX0000000000}{2:I202BANKDEFFXXXXN}{4:\n` +
      `:20:${ref}\n` +
      `:21:RELATEDREF001\n` +
      `:32A:250131USD500000,00\n` +
      `:52A:BANKGB2L\n` +
      `:58A:BANKDEFF\n-}`,
    mx: (ref) =>
      `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.08">\n` +
      `  <FICdtTrf>\n` +
      `    <GrpHdr>\n` +
      `      <MsgId>${ref}</MsgId>\n` +
      `    </GrpHdr>\n` +
      `    <CdtTrfTxInf>\n` +
      `      <PmtId><InstrId>${ref}</InstrId><EndToEndId>RELATEDREF001</EndToEndId></PmtId>\n` +
      `      <IntrBkSttlmAmt Ccy="USD">500000.00</IntrBkSttlmAmt>\n` +
      `    </CdtTrfTxInf>\n` +
      `  </FICdtTrf>\n` +
      `</Document>`,
  },
};

const monoBox: React.CSSProperties = {
  fontFamily: "Consolas, 'Courier New', monospace",
  fontSize: 12,
  background: "#f8f8f8",
  border: "1px solid #d1d1d1",
  borderRadius: 4,
  padding: 10,
  whiteSpace: "pre-wrap",
  overflowX: "auto",
  minHeight: 160,
  margin: 0,
};

/**
 * Exposed remote module ("./Widget"). Demonstrates a SWIFT MT -> ISO 20022
 * MX transformation step -- one of the capabilities a SWIFT modernization
 * platform consolidates (see the "Message Transformation" capability at
 * https://www.prowidesoftware.com/solutions/swift-modernization). This is
 * an illustrative UI/architecture demo, not a certified or schema-validated
 * translation -- the point being demonstrated is the micro-frontend
 * architecture (independent deploy, shared reference data, version safety),
 * not SWIFT standards compliance itself.
 *
 * `sharedValue` here plays the role of the message's own reference (SWIFT
 * field 20, "Sender's Reference" / ISO 20022 MsgId): the one identifier a
 * real transformation, validation, and archive/search module would all
 * need to agree on for the same message as it moves through a pipeline.
 * Editing it here immediately updates MFE 2 (Compliance Validation) and
 * the host panel, and vice versa.
 */
const App: React.FC<WidgetProps> = ({
  title = "SWIFT MT \u2192 ISO 20022 MX Transformation",
  sharedValue = "",
  onSharedValueChange,
}) => {
  const [sample, setSample] = React.useState<SampleKey>("mt103");
  const [transformed, setTransformed] = React.useState(false);

  const ref = sharedValue || "REF-DEMO-0001";

  return (
    <div
      style={{
        border: "1px solid #d1d1d1",
        borderRadius: 6,
        padding: 16,
        fontFamily: "Segoe UI, sans-serif",
        borderLeft: "4px solid #0f6cbd",
      }}
    >
      <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#a19f9d" }}>
        Illustrative demo -- not a certified SWIFT/ISO 20022 translation. Rendered
        by <code>mfe-transformation</code>, host React {React.version}.
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

      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        Sample message type
      </label>
      <select
        value={sample}
        onChange={(e) => {
          setSample(e.target.value as SampleKey);
          setTransformed(false);
        }}
        style={{ width: "100%", padding: "6px 8px", marginBottom: 12, borderRadius: 4, border: "1px solid #8a8886" }}
      >
        {(Object.keys(SAMPLES) as SampleKey[]).map((key) => (
          <option key={key} value={key}>
            {SAMPLES[key].label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setTransformed(true)}
        style={{
          background: "#0f6cbd",
          color: "white",
          border: "none",
          borderRadius: 4,
          padding: "6px 14px",
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Transform to ISO 20022 MX
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>SWIFT MT (source)</div>
          <pre style={monoBox}>{SAMPLES[sample].mt(ref)}</pre>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ISO 20022 MX (preview)</div>
          <pre style={monoBox}>{transformed ? SAMPLES[sample].mx(ref) : "Click \u201cTransform to ISO 20022 MX\u201d..."}</pre>
        </div>
      </div>
    </div>
  );
};

export default App;

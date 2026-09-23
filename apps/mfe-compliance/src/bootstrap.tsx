import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";

const el = document.getElementById("root");
if (el) {
  const StandaloneHarness: React.FC = () => {
    const [value, setValue] = React.useState("REF-DEMO-0001");
    return <App title="Compliance Validation (standalone dev mode)" sharedValue={value} onSharedValueChange={setValue} />;
  };
  ReactDOM.render(<StandaloneHarness />, el);
}

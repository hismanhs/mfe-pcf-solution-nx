import * as React from "react";
import { Pivot, PivotItem } from "@fluentui/react/lib/Pivot";

export type ActiveTab = "transformation" | "compliance";

interface Props {
  active: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

/**
 * Two clickable headers, one per MFE. Deliberately just a Fluent `Pivot`
 * driving which panel is *visible*, not which is *mounted* -- see
 * App.tsx's comment on why both RemoteSlots stay mounted underneath. This
 * is what lets switching tabs prove data sharing survives the switch: the
 * other MFE never unmounts, never re-fetches its manifest, never loses its
 * in-flight state, it's simply hidden.
 */
export const TabHeader: React.FC<Props> = ({ active, onChange }) => {
  return (
    <Pivot
      selectedKey={active}
      onLinkClick={(item) => {
        if (item?.props.itemKey) onChange(item.props.itemKey as ActiveTab);
      }}
      styles={{ root: { marginBottom: 8 } }}
    >
      <PivotItem headerText="Message Transformation" itemKey="transformation" />
      <PivotItem headerText="Compliance Validation" itemKey="compliance" />
    </Pivot>
  );
};

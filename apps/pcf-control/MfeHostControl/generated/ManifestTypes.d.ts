/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    mfeUrl: ComponentFramework.PropertyTypes.StringProperty;
    remoteName: ComponentFramework.PropertyTypes.StringProperty;
    exposedModule: ComponentFramework.PropertyTypes.StringProperty;
    allowVersionMismatch: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    widgetProps: ComponentFramework.PropertyTypes.StringProperty;
    mfeUrl2: ComponentFramework.PropertyTypes.StringProperty;
    remoteName2: ComponentFramework.PropertyTypes.StringProperty;
    exposedModule2: ComponentFramework.PropertyTypes.StringProperty;
    sharedValue: ComponentFramework.PropertyTypes.StringProperty;
    newRelicAccountId: ComponentFramework.PropertyTypes.StringProperty;
    newRelicLicenseKey: ComponentFramework.PropertyTypes.StringProperty;
    newRelicApplicationId: ComponentFramework.PropertyTypes.StringProperty;
}
export interface IOutputs {
    sharedValue?: string;
}

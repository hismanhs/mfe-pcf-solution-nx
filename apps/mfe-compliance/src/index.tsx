// Module Federation requires the app's real entry logic to be in a module
// that's loaded via a dynamic import, so webpack can initialize the shared
// scope (react/react-dom singletons) before any shared module is evaluated.
import("./bootstrap");

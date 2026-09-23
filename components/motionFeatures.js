import { domMax } from "framer-motion";

// domMax (not domAnimation): several tab/segmented-control indicators use
// layoutId shared-layout animations (public carta categories, comanda tabs,
// menu category tabs, table-view segmented control), which domAnimation
// doesn't cover — the prop would silently stop animating rather than error.
export default domMax;

/**
 * All mixins
 */

import Props from "./mixins/props/defineProps.js";
import FormAssociated from "./mixins/form-associated.js";
import Events from "./mixins/events/defineEvents.js";
import ShadowStyles from "./mixins/styles/shadow.js";
import GlobalStyles from "./mixins/styles/global.js";

export { Props, FormAssociated, Events, ShadowStyles, GlobalStyles };

export default [Props, FormAssociated, Events, ShadowStyles, GlobalStyles];

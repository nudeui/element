/**
 * All mixins
 */

import Props from "./mixins/props/defineProps.js";
import FormAssociated from "./form-associated.js";
import Events from "./events/defineEvents.js";
import ShadowStyles from "./styles/shadow.js";
import GlobalStyles from "./styles/global.js";

export { Props, FormAssociated, Events, ShadowStyles, GlobalStyles };

export default [Props, FormAssociated, Events, ShadowStyles, GlobalStyles];

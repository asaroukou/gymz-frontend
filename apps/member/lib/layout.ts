/**
 * The tab bar's own content zone (icon+label pill, ≥44 pt tap area), before
 * the device's bottom safe-area inset is added. `@react-navigation/bottom-tabs`
 * takes a numeric `tabBarStyle.height` as-is and still applies
 * `paddingBottom: insets.bottom`, so a fixed height (e.g. 84) starves the
 * content zone on a notched device (84 - insets.bottom). Callers add the
 * live inset themselves: `height: TAB_BAR_CONTENT_HEIGHT + insets.bottom`.
 */
export const TAB_BAR_CONTENT_HEIGHT = 50;

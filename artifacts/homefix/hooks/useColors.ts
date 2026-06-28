import { useColorScheme } from "react-native";

import { Colors } from "@/constants/colors";

const RADIUS = 12;

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * (light or dark) plus scheme-independent values like `radius`.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? Colors.dark : Colors.light;
  return { ...palette, radius: RADIUS };
}
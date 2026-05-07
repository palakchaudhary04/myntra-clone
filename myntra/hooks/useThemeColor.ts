import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { themeMode } = useTheme(); 
  const colorFromProps = props[themeMode];

  return colorFromProps ? colorFromProps : Colors[themeMode][colorName];
}
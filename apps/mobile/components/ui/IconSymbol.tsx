import { MaterialIcons } from '@expo/vector-icons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'heart.fill': 'favorite',
  'bubble.left.and.bubble.right.fill': 'chat',
  'bell.fill': 'notifications',
  'chart.line.down.right': 'show-chart',
  'newspaper.fill': 'article',
  'plus.circle.fill': 'add-circle',
  'xmark.circle.fill': 'cancel',
  'trash': 'delete',
  'sparkles': 'auto-awesome',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'checkmark.shield.fill': 'verified',
  'magnifyingglass': 'search',
} as Partial<
  Record<
    import('expo-symbols').SymbolViewProps['name'],
    React.ComponentProps<typeof MaterialIcons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

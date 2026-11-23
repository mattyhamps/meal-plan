import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export const C = {
  bg: '#F6F2EA',
  card: '#FFFFFF',
  ink: '#1E2621',
  sub: '#5E6862',
  faint: '#9AA39D',
  line: '#E6E0D4',
  green: '#2F6B4F',
  greenSoft: '#E3EFE7',
  red: '#B4462B',
  redSoft: '#F6E3DC',
  amber: '#9A6A12',
  amberSoft: '#F5ECD6',
};

export const money = (x: number) => '$' + x.toFixed(2);

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = 'primary', small, disabled, style }: {
  label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost'; small?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn, small && s.btnSmall, kind === 'secondary' && s.btnSecondary, kind === 'ghost' && s.btnGhost,
        (pressed || disabled) && { opacity: 0.6 }, style,
      ]}
    >
      <Text style={[s.btnText, small && { fontSize: 14 }, kind !== 'primary' && { color: C.green }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, style }: { label: string; on: boolean; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }} aria-checked={on}
      onPress={onPress}
      style={[s.chip, on && s.chipOn, style]}
    >
      <Text style={[s.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function P({ children, style, numberOfLines }: { children: React.ReactNode; style?: TextStyle; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[s.p, style]}>{children}</Text>;
}
export function Small({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[s.small, style]}>{children}</Text>;
}

export function Checkbox({ on, onPress, label }: { on: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={label}
      onPress={onPress} hitSlop={8} style={[s.box, on && s.boxOn]}>
      {on ? <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓</Text> : null}
    </Pressable>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.line },
  btn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  btnSecondary: { backgroundColor: C.greenSoft },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipText: { color: C.ink, fontSize: 15, fontWeight: '500' },
  h1: { fontSize: 28, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '700', color: C.ink },
  p: { fontSize: 16, color: C.ink, lineHeight: 22 },
  small: { fontSize: 13, color: C.sub, lineHeight: 18 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.green, borderColor: C.green },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { App } from '../state';
import { DAYS, Settings, Slot, SLOTS } from '../types';
import { meta, suggestedBudget } from '../data';
import { Button, C, Card, Chip, H1, H2, P, Small } from '../ui';

const SLOT_LABEL: Record<Slot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const PLURAL: Record<Slot, string> = { breakfast: 'breakfasts', lunch: 'lunches', dinner: 'dinners' };
const SHORT: Record<Slot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export function WeekSetup({ app, onDone }: { app: App; onDone: () => void }) {
  const s = app.saved.settings;
  const [budgetText, setBudgetText] = useState(String(s.budget));
  const set = (patch: Partial<Settings>) => app.setSettings({ ...s, ...patch });

  const setPeople = (n: number) => {
    // keep the budget in step with household size unless they've typed their own
    const wasSuggested = s.budget === suggestedBudget[s.people];
    const budget = wasSuggested ? suggestedBudget[n] : s.budget;
    setBudgetText(String(budget));
    set({ people: n, budget });
  };
  const toggleSlot = (slot: Slot, d: number) => {
    const next = s.slots[slot].slice(); next[d] = !next[d];
    set({ slots: { ...s.slots, [slot]: next } });
  };
  const setDay = (d: number, on: boolean) => {
    const next = { ...s.slots };
    for (const k of SLOTS) { next[k] = s.slots[k].slice(); next[k][d] = on; }
    set({ slots: next });
  };
  const setRow = (slot: Slot, on: boolean) => set({ slots: { ...s.slots, [slot]: Array(7).fill(on) } });
  const count = SLOTS.reduce((t, k) => t + s.slots[k].filter(Boolean).length, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
      <View>
        <H1>{app.saved.setupDone ? 'Your week' : 'Plan a week'}</H1>
        <Small style={{ marginTop: 4 }}>
          Prices from {meta.store.name ?? 'ACME'} ({meta.store.address}), checked {meta.asOf}.
        </Small>
      </View>

      <Card style={{ gap: 12 }}>
        <H2>Who’s eating?</H2>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 2, 3, 4].map(n => (
            <Chip key={n} label={n === 1 ? '1 person' : `${n}`} on={s.people === n} onPress={() => setPeople(n)} style={{ flex: n === 1 ? 2 : 1 }} />
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <H2>Weekly budget</H2>
        <View style={st.moneyRow}>
          <Text style={st.dollar}>$</Text>
          <TextInput
            accessibilityLabel="Weekly budget in dollars"
            value={budgetText}
            onChangeText={t => {
              const clean = t.replace(/[^0-9.]/g, '');
              setBudgetText(clean);
              const v = parseFloat(clean);
              if (!isNaN(v) && v > 0) set({ budget: v });
            }}
            keyboardType="decimal-pad"
            style={st.moneyInput}
          />
          <Text style={{ color: C.sub, fontSize: 16, flexShrink: 0 }}>per week</Text>
        </View>
        {!(parseFloat(budgetText) > 0) ? (
          <Small style={{ color: C.red, fontWeight: '600' }}>Enter an amount above $0. Still using ${s.budget}.</Small>
        ) : null}
        <Small>
          Covers what you buy this week. Spices, oil, flour and similar basics aren’t counted unless you say you need them.
          A good start for {s.people} {s.people === 1 ? 'person' : 'people'} is about ${suggestedBudget[s.people]}.
        </Small>
        <View style={st.switchRow}>
          <View style={{ flex: 1 }}>
            <P style={{ fontWeight: '600' }}>Keep it easy</P>
            <Small>Dinners that take 30 minutes or less, or are tagged easy.</Small>
          </View>
          <Switch value={s.easy} onValueChange={v => set({ easy: v })} trackColor={{ true: C.green, false: C.line }} />
        </View>
      </Card>

      <Card style={{ gap: 12 }}>
        <H2>Which meals should we plan?</H2>
        <Small>Tap a meal to turn it off if you’ve got it covered, like pizza Friday. Tap a day’s name to skip the whole day.</Small>
        <View style={st.quickRow}>
          {SLOTS.map(slot => {
            const all = s.slots[slot].every(Boolean);
            return (
              <Pressable key={slot} onPress={() => setRow(slot, !all)} style={st.quick} accessibilityRole="button"
                accessibilityLabel={`${all ? 'Turn off' : 'Turn on'} every ${SLOT_LABEL[slot]}`}>
                <Text style={st.quickText}>{all ? `No ${PLURAL[slot]}` : `All ${PLURAL[slot]}`}</Text>
              </Pressable>
            );
          })}
        </View>
        {DAYS.map((d, i) => {
          const dayOn = SLOTS.some(slot => s.slots[slot][i]);
          return (
            <View key={d} style={st.dayRow}>
              <Pressable onPress={() => setDay(i, !dayOn)} style={st.dayName} hitSlop={6} accessibilityRole="button"
                accessibilityLabel={`${dayOn ? 'Turn off' : 'Turn on'} all of ${d}`}>
                <Text style={[st.dayText, !dayOn && { color: C.faint }]}>{d}</Text>
              </Pressable>
              {SLOTS.map(slot => {
                const on = s.slots[slot][i];
                return (
                  <Pressable key={slot} onPress={() => toggleSlot(slot, i)} accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${d} ${SLOT_LABEL[slot]}`}
                    style={({ pressed }) => [st.pill, on && st.pillOn, pressed && { opacity: 0.7 }]}>
                    <Text style={[st.pillText, on && { color: '#fff' }]}>{SHORT[slot]}</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
        <Small>{count} meals to plan.</Small>
      </Card>

      <Button
        label={app.saved.choices ? 'Make a new plan' : 'Make my plan'}
        disabled={count === 0}
        onPress={() => { app.makePlan(); onDone(); }}
      />
      {app.saved.choices ? (
        <Small style={{ textAlign: 'center' }}>Your current plan stays until you make a new one.</Small>
      ) : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  moneyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dollar: { fontSize: 28, fontWeight: '600', color: C.ink },
  moneyInput: { flex: 1, maxWidth: 140, fontSize: 28, fontWeight: '600', color: C.ink, borderBottomWidth: 2, borderColor: C.green, minWidth: 90, paddingVertical: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: C.line, paddingTop: 12, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quick: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.greenSoft, alignItems: 'center' },
  quickText: { color: C.green, fontSize: 13, fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayName: { width: 48, paddingVertical: 12 },
  dayText: { fontSize: 15, fontWeight: '700', color: C.ink },
  pill: { flex: 1, minHeight: 46, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: C.green, borderColor: C.green },
  pillText: { fontSize: 14, fontWeight: '600', color: C.sub },
});

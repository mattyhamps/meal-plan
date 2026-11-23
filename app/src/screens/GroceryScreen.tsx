import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { App } from '../state';
import { formatQty, kitchenAmount, pieceHint } from '../format';
import type { GroceryItem } from '../types';
import { meta } from '../data';
import { C, Card, Checkbox, H1, H2, money, P, Small } from '../ui';
import { BudgetBar } from './PlanScreen';

function amount(g: GroceryItem) {
  const pack = g.packages > 1 ? `${g.packages} × ` : '';
  return `${pack}${money(g.price)}`;
}
const UNIT_PLURAL: Record<string, string> = { packet: 'packets', slice: 'slices', bunch: 'bunches', can: 'cans', head: 'heads' };
function unitText(n: number, unit: string) {
  if (unit === 'each') return '';
  return ' ' + (n > 1.01 && UNIT_PLURAL[unit] ? UNIT_PLURAL[unit] : unit);
}
const KITCHEN_PLURAL: Record<string, string> = { stick: 'sticks', cup: 'cups', slice: 'slices', packet: 'packets', bunch: 'bunches' };
function usage(g: GroceryItem) {
  const bought = g.packages * g.size;
  if (g.needed >= bought * 0.95) return g.packages > 1 ? 'Uses all of them' : 'Uses all of it';
  const k = kitchenAmount(g.key, g.needed, g.unit, 'buy');
  const n = formatQty(k.qty);
  if (!n) return 'Uses a little';
  const u = k.unit === 'each' ? '' : ' ' + (k.qty > 1.01 && KITCHEN_PLURAL[k.unit] ? KITCHEN_PLURAL[k.unit] : k.unit);
  if (k.unit !== g.unit) return `Uses about ${n}${u}`; // measured differently from the package, e.g. tbsp of butter
  const hint = g.unit === 'lb' ? pieceHint(g.key, g.needed * 16) : '';
  return `Uses ${n}${u}${hint} of ${formatQty(bought)}${unitText(bought, g.unit)}`;
}

// Short, plain names for the list; the store's product name sits underneath.
const NAME_FIX: Record<string, string> = {
  'cheddar shredded': 'shredded cheddar', 'mozzarella shredded': 'shredded mozzarella', 'mexican cheese': 'shredded Mexican cheese',
  'chicken thighs boneless': 'boneless chicken thighs', 'chicken thighs bone-in': 'bone-in chicken thighs',
  'basil dried': 'dried basil', 'thyme dried': 'dried thyme', 'bbq sauce': 'BBQ sauce',
};
function shortName(key: string) {
  const n = NAME_FIX[key] ?? key;
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function packText(g: GroceryItem) {
  if (g.key === 'butter' && g.unit === 'oz') return `${formatQty(g.size / 4)} sticks`;
  const hint = g.unit === 'lb' ? pieceHint(g.key, g.size * 16).replace(/[()]/g, '').trim() : '';
  if (hint) return `${formatQty(g.size)} lb · ${hint}`;
  if (g.unit === 'each') return g.size === 1 ? '' : `pack of ${formatQty(g.size)}`;
  return `${formatQty(g.size)} ${UNIT_PLURAL[g.unit] && g.size > 1.01 ? UNIT_PLURAL[g.unit] : g.unit}`;
}

export function GroceryScreen({ app }: { app: App }) {
  const { plan, saved } = app;
  const [showBasics, setShowBasics] = useState(false);
  if (!plan) return <View style={{ padding: 20 }}><H1>Groceries</H1><P>Make a plan first.</P></View>;

  const buy = plan.groceries.filter(g => !g.basic && !app.have.has(g.key));
  const haveIt = plan.groceries.filter(g => !g.basic && app.have.has(g.key));
  const basics = plan.groceries.filter(g => g.basic);
  const aisles = [...new Set(buy.map(g => g.aisle))];
  const checked = new Set(saved.checked);
  const left = buy.filter(g => !checked.has(g.key)).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
      <View>
        <H1>Groceries</H1>
        <Small style={{ marginTop: 4 }}>{meta.store.name} · {left} of {buy.length} left to grab</Small>
      </View>
      <Card><BudgetBar total={plan.total} budget={saved.settings.budget} /></Card>

      {aisles.map(a => (
        <Card key={a} style={{ paddingVertical: 8 }}>
          <H2 style={{ fontSize: 15, color: C.sub, marginVertical: 6 }}>{a}</H2>
          {buy.filter(g => g.aisle === a).map(g => (
            <Item key={g.key} g={g} done={checked.has(g.key)} onCheck={() => app.toggleChecked(g.key)}
              action="Have it" onAction={() => app.toggleHave(g.key)} />
          ))}
        </Card>
      ))}

      {haveIt.length ? (
        <Card style={{ paddingVertical: 8 }}>
          <H2 style={{ fontSize: 15, color: C.sub, marginVertical: 6 }}>Already have (not counted)</H2>
          {haveIt.map(g => (
            <Item key={g.key} g={g} muted action="Need it" onAction={() => app.toggleHave(g.key)} />
          ))}
        </Card>
      ) : null}

      <Card style={{ paddingVertical: 8 }}>
        <Pressable onPress={() => setShowBasics(v => !v)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
          <H2 style={{ fontSize: 15, color: C.sub }}>Pantry basics ({basics.length}) {showBasics ? '▾' : '▸'}</H2>
          <Small>Spices, oils, flour, soy sauce and the like. Not counted unless you mark one as needed.</Small>
        </Pressable>
        {showBasics && basics.map(g => {
          const need = app.have.has('!' + g.key);
          return (
            <Item key={g.key} g={g} muted={!need} action={need ? 'Have it' : 'Need it'}
              onAction={() => app.toggleHave('!' + g.key)} />
          );
        })}
      </Card>
      <Small style={{ textAlign: 'center' }}>Prices are estimates from the store’s website and can change.</Small>
    </ScrollView>
  );
}

function Item({ g, done, onCheck, muted, action, onAction }: {
  g: GroceryItem; done?: boolean; onCheck?: () => void; muted?: boolean; action: string; onAction: () => void;
}) {
  return (
    <View style={st.item}>
      {onCheck ? <Checkbox on={!!done} onPress={onCheck} label={g.name} /> : <View style={{ width: 24 }} />}
      <View style={{ flex: 1, opacity: done || muted ? 0.5 : 1 }}>
        <Text style={[st.name, done && { textDecorationLine: 'line-through' }]}>
          {shortName(g.key)}{packText(g) ? <Text style={st.pack}>{`  ${packText(g)}`}</Text> : null}
        </Text>
        <Text style={st.product} numberOfLines={1}>{g.name}</Text>
        <Small>{usage(g)} · {g.usedBy.length > 2 ? `${g.usedBy.length} meals` : g.usedBy.join(', ')}</Small>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[st.price, (done || muted) && { color: C.faint }]}>{amount(g)}</Text>
        <Pressable onPress={onAction} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${action}: ${g.name}`}>
          <Text style={{ color: C.green, fontSize: 12, fontWeight: '600' }}>{action}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: '#F0EBE1' },
  name: { fontSize: 15, color: C.ink, fontWeight: '500' },
  pack: { fontSize: 13, color: C.sub, fontWeight: '400' },
  product: { fontSize: 12, color: C.faint, marginBottom: 1 },
  price: { fontSize: 15, fontWeight: '600', color: C.ink },
});

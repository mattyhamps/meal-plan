import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatQty, ingredientText, pieceHint, isBasic, mealIndex, scaledIngredients, totalMinutes } from '../format';
import { DAYS } from '../types';
import { blends, data } from '../data';
import { C, Card, H1, H2, P, Small } from '../ui';


const NICE: Record<string, string> = { 'chicken breast': 'chicken breast', 'chicken thighs boneless': 'boneless chicken thighs' };

export function RecipeScreen({ id, servings, onClose, subs = {}, leftoverFrom }: {
  id: string; servings: number; onClose: () => void; subs?: Record<string, string>; leftoverFrom?: number;
}) {
  const m = mealIndex(data)[id];
  if (!m) return null;
  const ings = scaledIngredients(m, servings);
  const factor = servings / m.servings;
  const mins = totalMinutes(m);
  const usedBlends = m.blends.map(b => blends[b]).filter(Boolean);
  const basic = (k?: string) => !!k && !k.startsWith('blend:') && isBasic(k, data.prices[k]);
  const toBuy = ings.filter(i => !basic(i.key));
  const pantry = ings.filter(i => basic(i.key));
  const line = (i: typeof ings[number], k: number) => {
    const t = ingredientText(i);
    return (
      <View key={k} style={st.ing}>
        <Text style={st.qty}>{t.qty}</Text>
        <Text style={st.ingName}>
          {t.name}
          {i.key && (i.unit === 'oz' || i.unit === 'lb') ? pieceHint(subs[i.key] ?? i.key, i.unit === 'lb' ? i.qty * 16 : i.qty) : ''}
          {i.key && subs[i.key] ? <Text style={{ color: C.green }}>{`  · using ${NICE[subs[i.key]] ?? subs[i.key]} this week`}</Text> : null}
        </Text>
      </View>
    );
  };
  const blendQty = (name: string) => ings.find(i => i.item.toLowerCase() === name.toLowerCase());

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.top}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back to plan">
          <Text style={{ color: C.green, fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 14, paddingBottom: 60 }}>
        <View style={{ gap: 6 }}>
          <H1 style={{ fontSize: 26 }}>{m.name}</H1>
          <Small>
            {[mins ? `${mins} min` : null, m.inactive ? `+ ${m.inactive} min hands-off` : null,
              `${formatQty(servings)} ${servings === 1 ? 'serving' : 'servings'}`,
              m.calories ? `${m.calories} cal/serving` : null].filter(Boolean).join(' · ')}
          </Small>
          {factor !== 1 ? <Small>Amounts adjusted from the original {m.servings}-serving recipe.</Small> : null}
        </View>

        {leftoverFrom != null ? (
          <Card style={{ backgroundColor: C.amberSoft, borderColor: C.amberSoft, gap: 4 }}>
            <P style={{ fontWeight: '700', color: C.amber }}>Leftovers from {DAYS[leftoverFrom]}’s dinner</P>
            <Small style={{ color: C.amber }}>
              Nothing to cook. Reheat a portion until it’s hot all the way through: about 2 minutes in the microwave, or a few minutes in a covered pan.
              The recipe below is for reference.
            </Small>
          </Card>
        ) : null}

        <Card style={{ gap: 2 }}>
          <H2 style={{ marginBottom: 6 }}>Ingredients</H2>
          {toBuy.map(line)}
          {pantry.length ? (
            <>
              <Text style={st.sub}>Pantry basics</Text>
              {pantry.map(line)}
            </>
          ) : null}
        </Card>

        {usedBlends.length ? (
          <Card style={{ gap: 10 }}>
            <H2>Make it yourself</H2>
            {usedBlends.map(b => {
              const q = blendQty(b.name);
              return (
                <View key={b.id} style={{ gap: 4 }}>
                  <P style={{ fontWeight: '600' }}>
                    {b.name}{q ? ` · you need ${formatQty(q.qty)} ${q.unit}` : ''}
                  </P>
                  {b.buy ? <Small>Store-bought: {b.buy}</Small> : null}
                  {b.perPacket ? (
                    <Small>
                      Per {b.packetSize ?? 'packet'}: {b.perPacket.map(x => typeof x === 'string' ? x : `${formatQty(x.qty)} ${x.unit} ${x.item}`).join(', ')}
                    </Small>
                  ) : null}
                  {b.jarRatioParts ? (
                    <Small>For a jar, mix by parts: {Object.entries(b.jarRatioParts).map(([k, v]) => `${v} ${k}`).join(', ')}.</Small>
                  ) : null}
                  {b.batch ? <Small>Batch: {b.batch.join(', ')}.</Small> : null}
                  {b.method ? <Small>{b.method}</Small> : null}
                </View>
              );
            })}
          </Card>
        ) : null}

        <Card style={{ gap: 12 }}>
          <H2>Steps</H2>
          {m.steps.map((t, k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={st.num}><Text style={{ color: '#fff', fontWeight: '700' }}>{k + 1}</Text></View>
              <P style={{ flex: 1 }}>{t}</P>
            </View>
          ))}
        </Card>

        {m.freezer && m.freezer.rating !== 'no' ? (
          <Card style={{ backgroundColor: C.greenSoft, borderColor: C.greenSoft }}>
            <P style={{ fontWeight: '600' }}>Freezes {m.freezer.rating === 'great' ? 'well' : 'OK'}{m.freezer.months ? ` for up to ${m.freezer.months} months` : ''}</P>
            {m.freezer.tip ? <Small>{m.freezer.tip}</Small> : null}
          </Card>
        ) : null}
        <Small>
          {m.source === 'HelloFresh' ? 'Adapted from a HelloFresh card, with the steps rewritten in our own words.'
            : m.source === 'Staple' ? 'House staple.' : 'From your Notion recipes.'}
        </Small>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingVertical: 12 },
  ing: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  qty: { width: 82, color: C.sub, fontSize: 15, fontWeight: '600' },
  ingName: { flex: 1, fontSize: 15, color: C.ink },
  sub: { fontSize: 13, fontWeight: '700', color: C.sub, marginTop: 12, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});

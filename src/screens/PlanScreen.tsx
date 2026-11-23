import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { App } from '../state';
import { amountText, CookAhead, DAYS, formatQty, ingredientText, pieceHint, Plan, FreezeNote, mealIndex, Slot, swapOptions, totalMinutes } from '../planner';
import { blends, data } from '../data';
import { Button, C, Card, H1, H2, money, P, Small } from '../ui';

const ix = mealIndex(data);
const name = (id: string) => ix[id]?.name ?? id;

export function BudgetBar({ total, budget }: { total: number; budget: number }) {
  const diff = budget - total;
  const over = diff < 0;
  const pct = Math.min(1, total / Math.max(budget, 1));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: C.ink }}>{money(total)}</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: over ? C.red : C.green }}>
          {over ? `${money(-diff)} over` : `${money(diff)} under`}
        </Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: over ? C.red : C.green }} />
      </View>
      <Small>Estimated groceries for the week, out of your {money(budget)} budget.</Small>
    </View>
  );
}

type SwapTarget = { day: number; slot: Slot } | null;

export function PlanScreen({ app, openRecipe, goSetup }: {
  app: App; openRecipe: (id: string, servings: number, leftoverFrom?: number) => void; goSetup: () => void;
}) {
  const { plan, saved } = app;
  const [swapFor, setSwapFor] = useState<SwapTarget>(null);
  const [swapSeed, setSwapSeed] = useState(1);
  const s = saved.settings;

  const options = useMemo(() => {
    if (!swapFor || !saved.choices) return [];
    return swapOptions(saved.choices, swapFor.day, swapFor.slot, s, data, app.have, swapSeed);
  }, [swapFor, saved.choices, s, app.have, swapSeed]);

  if (!plan || !saved.choices) {
    return (
      <View style={{ padding: 20, gap: 12 }}>
        <H1>No plan yet</H1>
        <P>Pick your meals and budget first.</P>
        <Button label="Set up my week" onPress={goSetup} />
      </View>
    );
  }

  const notesFor = (day: number, slot: Slot) => {
    const out: React.ReactNode[] = [];
    const give = plan.cookAhead.filter(a => a.day === day && a.slot === slot);
    if (give.length) out.push(<CookExtra key="give" list={give} subs={plan.subs} />);
    const get = plan.cookAhead.filter(a => a.forDay === day && a.forSlot === slot);
    if (get.length) out.push(<UseSaved key="get" list={get} subs={plan.subs} />);
    for (const n of plan.freezeNotes.filter(n => n.day === day && n.slot === slot)) out.push(<Freeze key={n.key} n={n} />);
    return out;
  };

  const row = (day: number, slot: Slot, label: string, id: string, servings: number, detail: string, canSwap = true) => (
    <View key={slot}>
    <View style={st.row}>
      <Text style={st.slot}>{label}</Text>
      <Pressable style={{ flex: 1 }} onPress={() => openRecipe(id, servings)} accessibilityRole="button"
        accessibilityLabel={`Open recipe for ${name(id)}`}>
        <Text style={st.meal}>{name(id)}</Text>
        {detail ? <Small>{detail}</Small> : null}
      </Pressable>
      {canSwap ? (
        <Pressable onPress={() => { setSwapSeed(x => x + 1); setSwapFor({ day, slot }); }} style={st.swapBtn}
          accessibilityRole="button" accessibilityLabel={`${slot === 'dinner' ? 'Change' : 'Swap'} ${slot} on ${DAYS[day]}`}>
          <Text style={{ color: C.green, fontWeight: '600', fontSize: 13 }}>{slot === 'dinner' ? 'Change' : 'Swap'}</Text>
        </Pressable>
      ) : null}
    </View>
    {notesFor(day, slot)}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <H1>This week</H1>
        <Button label="New plan" kind="secondary" small onPress={app.makePlan} />
      </View>
      {app.undo ? (
        <View style={[st.banner, { backgroundColor: C.greenSoft }]}>
          <Text style={[st.bannerText, { color: C.green }]}>Made a new plan.</Text>
          <Pressable onPress={app.undoPlan} hitSlop={8} accessibilityRole="button">
            <Text style={[st.bannerText, { color: C.green, textDecorationLine: 'underline' }]}>Undo</Text>
          </Pressable>
          <Pressable onPress={app.clearUndo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Text style={[st.bannerText, { color: C.green }]}>✕</Text>
          </Pressable>
        </View>
      ) : null}
      {app.stale ? (
        <View style={[st.banner, { backgroundColor: C.redSoft, flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
          <Text style={[st.bannerText, { color: C.red }]}>{app.stale} Make a new plan to match your week.</Text>
          <Button label="Make a new plan" small onPress={app.makePlan} />
        </View>
      ) : null}
      <Card><BudgetBar total={plan.total} budget={s.budget} /></Card>
      <PrepAhead plan={plan} />

      {plan.days.map((d, i) => {
        if (!d.breakfast && !d.lunch && !d.dinner) return null;
        return (
          <Card key={i} style={{ paddingVertical: 10 }}>
            <H2 style={{ marginBottom: 4 }}>{DAYS[i]}</H2>
            {d.breakfast && row(i, 'breakfast', 'Breakfast', d.breakfast.recipeId, d.breakfast.servings,
              timesShown(plan.days.map(x => x.breakfast?.recipeId), i))}
            {d.lunch && (
              <View>
                {d.lunch.leftovers.map(l => (
                  <View style={st.row} key={'lo' + l.fromDay}>
                    <Text style={st.slot}>Lunch</Text>
                    <Pressable style={{ flex: 1 }} onPress={() => openRecipe(l.recipeId, plan.days[l.fromDay].dinner?.servings ?? l.portions, l.fromDay)}
                      accessibilityRole="button" accessibilityLabel={`Leftovers: ${name(l.recipeId)}`}>
                      <Text style={st.meal}>{name(l.recipeId)}</Text>
                      <Small>Leftovers from {DAYS[l.fromDay]} · {l.portions} {l.portions === 1 ? 'portion' : 'portions'}</Small>
                    </Pressable>
                    <View style={st.tag}><Text style={st.tagText}>Leftover</Text></View>
                  </View>
                ))}
                {d.lunch.staple && row(i, 'lunch', d.lunch.leftovers.length ? '' : 'Lunch', d.lunch.staple.recipeId,
                  d.lunch.staple.servings,
                  d.lunch.leftovers.length ? `For ${d.lunch.staple.servings} more ${d.lunch.staple.servings === 1 ? 'person' : 'people'}` : timesShown(plan.days.map(x => x.lunch?.staple?.recipeId), i))}
              </View>
            )}
            {d.dinner && row(i, 'dinner', 'Dinner', d.dinner.recipeId, d.dinner.servings, dinnerDetail(d.dinner, s.people))}
          </Card>
        );
      })}

      <Modal visible={!!swapFor} transparent animationType="slide" onRequestClose={() => setSwapFor(null)}>
        <Pressable style={st.backdrop} onPress={() => setSwapFor(null)} accessibilityLabel="Close swap options" />
        <View style={st.sheet}>
          <H2>{swapFor ? `${DAYS[swapFor.day]} ${swapFor.slot}` : ''}</H2>
          {swapFor && swapFor.slot === 'dinner' ? (
            <View style={{ gap: 8 }}>
              <Small style={{ fontWeight: '600' }}>Move to another day</Small>
              <View style={st.dayGrid}>
                {DAYS.map((d, k) => {
                  if (k === swapFor.day) return null;
                  const other = plan.days[k].dinner;
                  return (
                    <Pressable key={d} style={st.dayChip} accessibilityRole="button"
                      accessibilityLabel={`Move to ${d}${other ? `, trading with ${name(other.recipeId)}` : ''}`}
                      onPress={() => { app.move(swapFor.day, k); setSwapFor(null); }}>
                      <Text style={st.dayChipDay}>{d}</Text>
                      <Text style={st.dayChipMeal} numberOfLines={1}>{other ? name(other.recipeId) : 'No dinner'}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Small style={{ fontWeight: '600', marginTop: 6 }}>Or swap for a different meal</Small>
            </View>
          ) : null}
          {swapFor && swapFor.slot !== 'dinner' ? (
            <Small>This changes every day that has the same {swapFor.slot}, since you’d shop for them together.</Small>
          ) : null}
          {options.length === 0 ? <P>No other options fit right now.</P> : null}
          {options.map(o => {
            const m = ix[o.recipeId];
            return (
              <Pressable key={o.recipeId} style={st.option} accessibilityRole="button"
                onPress={() => { app.swap(swapFor!.day, swapFor!.slot, o.recipeId); setSwapFor(null); }}>
                <View style={{ flex: 1 }}>
                  <Text style={st.meal}>{m.name}</Text>
                  <Small>{totalMinutes(m) ? `${totalMinutes(m)} min` : ''}{m.easy ? ' · easy' : ''}</Small>
                </View>
                <Text style={{ fontWeight: '700', color: o.delta > 0.005 ? C.red : C.green }}>
                  {Math.abs(o.delta) < 0.01 ? 'same' : (o.delta > 0 ? '+' : '−') + money(Math.abs(o.delta))}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Show 3 others" kind="secondary" style={{ flex: 1 }} onPress={() => setSwapSeed(x => x + 1)} />
            <Button label="Cancel" kind="ghost" style={{ flex: 1 }} onPress={() => setSwapFor(null)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// counts only the days where this meal actually appears in the plan
// ---------- prep ahead: homemade blends, pastes and sauces for the week ----------
type PrepItem = { id: string; name: string; kind: string; tbsp: number; meals: string[]; mult: number };

function prepList(plan: Plan): PrepItem[] {
  const byName = new Map(Object.values(blends).map(b => [b.name.toLowerCase(), b]));
  const out = new Map<string, PrepItem>();
  for (const c of plan.cooked) {
    const m = ix[c.recipeId];
    const f = c.servings / m.servings;
    for (const i of [...m.ingredients, ...m.pantry]) {
      if (!i.key?.startsWith('blend:')) continue;
      const b = byName.get(i.key.slice(6));
      if (!b || b.kind === 'store-bought') continue;
      const packetTbsp = parseFloat(b.packetSize ?? '1') || 1;
      const tbsp = (i.unit === 'packet' ? i.qty * packetTbsp : i.unit === 'tsp' ? i.qty / 3 : i.qty) * f;
      const e = out.get(b.id) ?? { id: b.id, name: b.name, kind: b.kind, tbsp: 0, meals: [], mult: 0 };
      e.tbsp += tbsp;
      const label = `${DAYS[c.day]} ${short(c.recipeId)}`;
      if (!e.meals.includes(label)) e.meals.push(label);
      e.mult = e.tbsp / packetTbsp;
      out.set(b.id, e);
    }
  }
  return [...out.values()];
}

function PrepAhead({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState<string | null>(null);
  const items = prepList(plan);
  if (!items.length) return null;
  return (
    <Card style={{ gap: 4 }}>
      <H2>Prep ahead</H2>
      <Small>Homemade blends and sauces for this week. Tap one to see how to make it.</Small>
      {items.map(p => {
        const b = blends[p.id];
        const isOpen = open === p.id;
        const amt = p.tbsp >= 8 ? `${formatQty(Math.round(p.tbsp / 16 * 4) / 4)} cup` : `${formatQty(Math.max(0.5, Math.round(p.tbsp * 2) / 2))} tbsp`;
        return (
          <Pressable key={p.id} onPress={() => setOpen(isOpen ? null : p.id)} style={st.prep}
            accessibilityRole="button" accessibilityLabel={`${p.name}, ${amt}. ${isOpen ? 'Hide' : 'Show'} recipe`}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={[st.meal, { flex: 1 }]}>{p.name}</Text>
              <Text style={{ color: C.ink, fontWeight: '600' }}>{amt}</Text>
              <Text style={{ color: C.green, fontSize: 13 }}>{isOpen ? '▾' : '▸'}</Text>
            </View>
            <Small>For {p.meals.join(', ')}</Small>
            {isOpen && b ? (
              <View style={{ marginTop: 8, gap: 3 }}>
                {b.perPacket?.map((x, k) => {
                  if (typeof x === 'string') return <Small key={k} style={{ color: C.ink }}>• {x}{p.mult > 1.05 ? ` (×${formatQty(Math.round(p.mult * 2) / 2)})` : ''}</Small>;
                  const t = ingredientText({ ...x, qty: x.qty * p.mult });
                  return <Small key={k} style={{ color: C.ink }}>• {t.qty} {t.name}</Small>;
                })}
                {b.batch ? <Small style={{ color: C.ink }}>Makes a batch: {b.batch.join(', ')}.</Small> : null}
                {b.method ? <Small>{b.method}</Small> : null}
                <Small style={{ marginTop: 2 }}>
                  {b.kind === 'spice blend' ? 'Mix in a small jar. Keeps for months, so feel free to make extra.'
                    : b.kind === 'sauce' ? 'Stir together up to a day ahead and keep it in the fridge.' : ''}
                </Small>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
  );
}

function Note({ text, detail }: { text: string; detail?: string }) {
  return (
    <View style={[st.freeze, { backgroundColor: C.amberSoft }]} accessibilityLabel={text}>
      <Text style={[st.freezeText, { color: C.amber }]}>{text}</Text>
      {detail ? <Text style={[st.freezeText, { color: C.amber, fontWeight: '400', marginTop: 4 }]}>{detail}</Text> : null}
    </View>
  );
}

const PROTEIN_NAME: Record<string, string> = { 'chicken thighs boneless': 'chicken thighs', 'chicken breast': 'chicken breast', 'pork butt': 'pork shoulder' };
const proteinName = (key: string) => PROTEIN_NAME[key] ?? key;
const short = (id: string) => name(id).replace(/^Mini /, '');

function weightText(oz: number, key: string) {
  const unit = data.prices[key]?.unit;
  if (unit !== 'lb') return `${Math.round(oz)} oz ${proteinName(key)}`;
  const w = oz < 16 ? `${Math.max(1, Math.round(oz))} oz` : `${formatQty(Math.round((oz / 16) * 4) / 4)} lb`;
  return `${w} ${proteinName(key)}${pieceHint(key, oz)}`;
}

/** One note on the earlier meal listing everything to cook extra. */
function CookExtra({ list, subs }: { list: CookAhead[]; subs: Record<string, string> }) {
  const lines: string[] = [];
  const meat = new Map<string, CookAhead[]>();
  for (const a of list.filter(a => a.kind !== 'rice')) {
    const k = subs[a.rawKey] ?? a.rawKey;
    meat.set(k, [...(meat.get(k) ?? []), a]);
  }
  for (const [key, uses] of meat) {
    const total = uses.reduce((t, a) => t + a.rawOz, 0);
    const forWhat = uses.map(a => `${uses.length > 1 ? `${Math.round(a.rawOz)} oz ` : ''}${a.kind === 'chicken' ? 'shredded ' : ''}for ${DAYS[a.forDay]}’s ${short(a.forRecipe)}`);
    lines.push(`${weightText(total, key)}, ${forWhat.join('; ')}`);
  }
  const rice = list.filter(a => a.kind === 'rice');
  if (rice.length) {
    const cups = Math.max(0.25, Math.round((rice.reduce((t, a) => t + a.rawOz, 0) / 6.5) * 4) / 4);
    lines.push(`${formatQty(cups)} ${cups <= 1 ? 'cup' : 'cups'} uncooked rice, for ${rice.map(a => `${DAYS[a.forDay]}’s ${short(a.forRecipe)}`).join('; ')}`);
  }
  const tips = [
    meat.size ? 'Set extras aside before adding sauce or spices.' : '',
    rice.length ? 'Cool rice on a plate before covering.' : '',
    list.some(a => a.freeze) ? 'Freeze anything you won’t use within 3 days.' : 'Keeps 3 days in the fridge.',
  ].filter(Boolean).join(' ');
  return (
    <View style={[st.freeze, { backgroundColor: C.amberSoft }]}>
      <Text style={[st.freezeText, { color: C.amber }]}>Cook extra for later</Text>
      {lines.map(l => <Text key={l} style={[st.freezeText, { color: C.amber, fontWeight: '400', marginTop: 4 }]}>• {l}</Text>)}
      <Text style={[st.freezeText, { color: C.amber, fontWeight: '400', marginTop: 6, opacity: 0.85 }]}>{tips}</Text>
    </View>
  );
}

/** One note on the later meal saying what to use. */
function UseSaved({ list, subs }: { list: CookAhead[]; subs: Record<string, string> }) {
  const byDay = new Map<number, string[]>();
  for (const a of list) {
    const what = a.kind === 'rice' ? 'rice' : proteinName(subs[a.rawKey] ?? a.rawKey);
    const cur = byDay.get(a.day) ?? [];
    if (!cur.includes(what)) cur.push(what);
    byDay.set(a.day, cur);
  }
  const parts = [...byDay].map(([d, w]) => `${w.join(' and ')} from ${DAYS[d]}`);
  const extra = [
    list.some(a => a.kind === 'chicken') ? 'No rotisserie chicken needed.' : '',
    list.some(a => a.freeze) ? 'Thaw it in the fridge the night before.' : '',
  ].filter(Boolean).join(' ');
  return <Note text={`Use the saved ${parts.join(', ')}.`} detail={extra || undefined} />;
}

function Freeze({ n }: { n: FreezeNote }) {
  const [open, setOpen] = useState(false);
  const what = amountText(n.amount, n.unit, n.key) + pieceHint(n.key, n.unit === 'lb' ? n.amount * 16 : n.amount);
  const partOne = n.unit === 'each' && n.amount < 1; // e.g. part of a ginger root: no odd decimals
  const text = partOne
    ? `Freeze the leftover ${n.key} after cooking${n.nextDay == null ? '' : `. You’ll need it ${DAYS[n.nextDay]}`}.`
    : n.nextDay == null
    ? `Freeze the extra ${what} after cooking.`
    : `Freeze the leftover ${what} after cooking. You’ll need it ${DAYS[n.nextDay]}, so move it to the fridge the night before.`;
  return (
    <Pressable onPress={() => setOpen(v => !v)} style={st.freeze} accessibilityRole="button" accessibilityLabel={text}>
      <Text style={st.freezeText}>❄︎  {text}</Text>
      {open ? <Text style={[st.freezeText, { fontWeight: '400', marginTop: 4 }]}>{n.how}</Text> : null}
    </Pressable>
  );
}

function timesShown(shown: (string | undefined)[], day: number) {
  const n = shown.filter(x => x && x === shown[day]).length;
  return n > 1 ? `${n} days this week` : '';
}

function dinnerDetail(d: { servings: number; extra: number; extraTo: number[]; unused: number }, people: number) {
  const parts = [`Cook ${d.servings} ${d.servings === 1 ? 'serving' : 'servings'}`];
  if (d.extraTo.length) parts.push(`extra for ${d.extraTo.map(x => DAYS[x]).join(' & ')} lunch`);
  if (d.unused) parts.push(`${d.unused} extra to freeze or eat later`);
  return parts.join(' · ');
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderColor: '#F0EBE1' },
  slot: { width: 72, color: C.sub, fontSize: 13, fontWeight: '600' },
  meal: { fontSize: 16, color: C.ink, fontWeight: '500' },
  swapBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.greenSoft },
  tag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: C.amberSoft },
  tagText: { color: C.amber, fontSize: 12, fontWeight: '600' },
  freeze: { backgroundColor: '#E6EEF5', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, marginLeft: 82 },
  freezeText: { color: '#2C4A63', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: '31%', flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  dayChipDay: { fontSize: 14, fontWeight: '700', color: C.ink },
  dayChipMeal: { fontSize: 12, color: C.sub, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  bannerText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  prep: { paddingVertical: 10, borderTopWidth: 1, borderColor: '#F0EBE1' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: C.bg, padding: 20, paddingBottom: 34, gap: 10, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.line },
});

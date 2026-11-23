import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from './src/state';
import { WeekSetup } from './src/screens/WeekSetup';
import { PlanScreen } from './src/screens/PlanScreen';
import { GroceryScreen } from './src/screens/GroceryScreen';
import { RecipeScreen } from './src/screens/RecipeScreen';
import { Button, C } from './src/ui';

type Tab = 'plan' | 'groceries' | 'week';

function Main() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('week');
  const [recipe, setRecipe] = useState<{ id: string; servings: number; leftoverFrom?: number } | null>(null);

  useEffect(() => { if (app.loaded && app.saved.choices) setTab('plan'); }, [app.loaded]);

  if (!app.loaded) {
    return (
      <View style={[st.fill, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }]}>
        {app.error ? (
          <>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink, textAlign: 'center' }}>Can’t load recipes</Text>
            <Text style={{ fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20 }}>{app.error}</Text>
            <Button label="Try again" onPress={app.retry} />
          </>
        ) : <ActivityIndicator color={C.green} />}
      </View>
    );
  }
  if (recipe) return <RecipeScreen id={recipe.id} servings={recipe.servings} leftoverFrom={recipe.leftoverFrom} subs={app.plan?.subs} onClose={() => setRecipe(null)} />;

  const tabs: [Tab, string][] = [['plan', 'Plan'], ['groceries', 'Groceries'], ['week', 'Week']];
  return (
    <View style={st.fill}>
      {app.error ? (
        <Pressable onPress={app.retry} style={st.error} accessibilityRole="button">
          <Text style={st.errorText}>{app.error} Tap to retry.</Text>
        </Pressable>
      ) : null}
      <View style={st.fill}>
        {tab === 'week' && <WeekSetup app={app} onDone={() => setTab('plan')} />}
        {tab === 'plan' && <PlanScreen app={app} openRecipe={(id, servings, leftoverFrom) => setRecipe({ id, servings, leftoverFrom })} goSetup={() => setTab('week')} />}
        {tab === 'groceries' && <GroceryScreen app={app} />}
      </View>
      {app.saved.setupDone ? (
        <View style={st.tabs} accessibilityRole="tablist">
          {tabs.map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={st.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <View style={[st.dot, tab === k && { backgroundColor: C.green }]} />
              <Text style={[st.tabText, tab === k && { color: C.green }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[st.fill, { backgroundColor: C.bg }]} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={st.frame}><Main /></View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  frame: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: '#FBF9F4', paddingTop: 8, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  error: { backgroundColor: '#F6E3DC', padding: 10 },
  errorText: { color: '#B4462B', fontSize: 13, fontWeight: '600' },
  tabText: { fontSize: 13, fontWeight: '600', color: C.sub },
});

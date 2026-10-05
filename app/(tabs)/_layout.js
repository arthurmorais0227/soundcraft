import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useStudio } from '../../src/context/StudioContext';

function TabIcon({ name, focused, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: focused ? 1.2 : 1, useNativeDriver: true, friction: 5 }).start();
  }, [focused]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={focused ? name : `${name}-outline`} size={24} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { recordings } = useStudio();
  const tab = (name, title, icon, extra = {}) => (
    <Tabs.Screen
      name={name}
      options={{
        title,
        tabBarIcon: ({ focused, color }) => <TabIcon name={icon} focused={focused} color={color} />,
        ...extra,
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.violetLight,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: colors.coral, color: '#fff' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tab('index', 'Gravar', 'mic')}
      {tab('gravacoes', 'Gravações', 'list', { tabBarBadge: recordings.length || undefined })}
      {tab('pad', 'Pad', 'grid')}
      {tab('mesa', 'Mesa', 'options')}
    </Tabs>
  );
}

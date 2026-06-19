import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: "#1a1a2e", borderTopColor: "#333" },
        tabBarActiveTintColor: "#e94560",
        tabBarInactiveTintColor: "#888",
        headerStyle: { backgroundColor: "#1a1a2e" },
        headerTintColor: "#fff",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: () => <Text>🏠</Text> }} />
      <Tabs.Screen name="agendar" options={{ title: "Agendar", tabBarIcon: () => <Text>📅</Text> }} />
      <Tabs.Screen name="agenda" options={{ title: "Minha Agenda", tabBarIcon: () => <Text>📋</Text> }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: () => <Text>👤</Text> }} />
    </Tabs>
  );
}

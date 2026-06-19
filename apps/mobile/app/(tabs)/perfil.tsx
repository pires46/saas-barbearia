import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useApp } from "../../context/app-context";
import { Redirect } from "expo-router";
import { getInitials } from "@saas-barbearia/shared";

export default function PerfilScreen() {
  const { session, setSession } = useApp();

  if (!session) return <Redirect href="/" />;

  const logout = () => {
    Alert.alert("Sair", "Deseja trocar de barbearia?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => setSession(null) },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(session.name)}</Text>
      </View>
      <Text style={styles.name}>{session.name}</Text>
      <Text style={styles.phone}>{session.phone}</Text>
      <Text style={styles.tenant}>{session.tenantName}</Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{session.visitCount || 0}</Text>
          <Text style={styles.statLabel}>Visitas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{session.loyaltyPoints || 0}</Text>
          <Text style={styles.statLabel}>Pontos</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{session.vip ? "VIP" : "—"}</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Trocar barbearia / Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", padding: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#e9456020", alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 16 },
  avatarText: { fontSize: 28, fontWeight: "bold", color: "#e94560" },
  name: { fontSize: 22, fontWeight: "bold", color: "#fff", textAlign: "center", marginTop: 12 },
  phone: { fontSize: 14, color: "#888", textAlign: "center" },
  tenant: { fontSize: 13, color: "#e94560", textAlign: "center", marginTop: 4 },
  stats: { flexDirection: "row", justifyContent: "space-around", marginTop: 24, marginBottom: 24 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#e94560" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 4 },
  logoutBtn: { backgroundColor: "#1a1a2e", borderRadius: 10, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#333" },
  logoutText: { color: "#ef4444", fontWeight: "500" },
});

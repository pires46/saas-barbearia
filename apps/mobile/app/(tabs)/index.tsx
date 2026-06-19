import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { Link } from "expo-router";
import { useApp } from "../../context/app-context";

export default function HomeScreen() {
  const { session, setSession, apiUrl, loading } = useApp();
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Carregando...</Text>
      </View>
    );
  }

  if (!session) {
    const connect = async () => {
      if (!slug || !phone || !name) {
        Alert.alert("Preencha todos os campos");
        return;
      }
      try {
        const res = await fetch(`${apiUrl}/api/public/${slug.trim()}/client`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone }),
        });
        if (!res.ok) {
          const err = await res.json();
          Alert.alert("Erro", err.error || "Barbearia não encontrada");
          return;
        }
        const data = await res.json();

        await setSession({
          slug: data.tenant.slug,
          tenantName: data.tenant.name,
          phone,
          name: data.client.name,
          clientId: data.client.id,
          loyaltyPoints: data.client.loyaltyPoints || 0,
          visitCount: data.client.visitCount || 0,
          vip: data.client.vip || false,
        });
      } catch {
        Alert.alert("Erro", "Não foi possível conectar. Verifique se o servidor está ativo.");
      }
    };

    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>BarberSaaS</Text>
          <Text style={styles.subtitle}>Conecte-se à sua barbearia</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Link da barbearia</Text>
          <View style={styles.slugRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="minha-barbearia"
              placeholderTextColor="#666"
              value={slug}
              onChangeText={setSlug}
              autoCapitalize="none"
            />
            <Text style={styles.slugSuffix}>.seusistema.com.br</Text>
          </View>
          <Text style={styles.label}>Seu nome</Text>
          <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor="#666" value={name} onChangeText={setName} />
          <Text style={styles.label}>Telefone</Text>
          <TextInput style={styles.input} placeholder="(11) 99999-0000" placeholderTextColor="#666" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.btn} onPress={connect}>
            <Text style={styles.btnText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{session.tenantName}</Text>
        <Text style={styles.subtitle}>Olá, {session.name}!</Text>
      </View>
      <View style={styles.grid}>
        <Link href="/agendar" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>📅</Text>
            <Text style={styles.cardTitle}>Agendar</Text>
            <Text style={styles.cardDesc}>Escolha serviço, barbeiro e horário</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/agenda" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Minha Agenda</Text>
            <Text style={styles.cardDesc}>Veja, reagende ou cancele</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/perfil" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardTitle}>Perfil</Text>
            <Text style={styles.cardDesc}>Pontos e histórico</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a" },
  center: { flex: 1, backgroundColor: "#0f0f1a", alignItems: "center", justifyContent: "center" },
  loading: { color: "#888" },
  header: { padding: 24, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 16, color: "#888", marginTop: 4 },
  form: { padding: 16 },
  label: { color: "#ccc", fontSize: 14, marginBottom: 6, marginTop: 12 },
  slugRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  slugSuffix: { color: "#666", fontSize: 11, flexShrink: 1 },
  input: { backgroundColor: "#1a1a2e", borderRadius: 10, padding: 14, color: "#fff", borderWidth: 1, borderColor: "#333" },
  btn: { backgroundColor: "#e94560", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 24 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  card: { width: "47%", backgroundColor: "#1a1a2e", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#333" },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#fff" },
  cardDesc: { fontSize: 12, color: "#888", marginTop: 4 },
});

import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useApp } from "../../context/app-context";
import { Redirect } from "expo-router";

interface Appointment {
  id: string;
  startTime: string;
  status: string;
  employee: { name: string };
  service: { name: string };
}

const STATUS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default function AgendaScreen() {
  const { session, apiUrl } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  if (!session) return <Redirect href="/" />;

  const load = () => {
    fetch(`${apiUrl}/api/public/${session.slug}/appointments?phone=${encodeURIComponent(session.phone)}`)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    Alert.alert("Cancelar", "Deseja cancelar este agendamento?", [
      { text: "Não", style: "cancel" },
      {
        text: "Sim",
        onPress: async () => {
          await fetch(`${apiUrl}/api/public/${session.slug}/appointments`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointmentId: id, phone: session.phone, action: "cancel" }),
          });
          load();
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.container}><Text style={styles.loading}>Carregando...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Meus Agendamentos</Text>
      {appointments.length === 0 ? (
        <Text style={styles.empty}>Nenhum agendamento encontrado</Text>
      ) : (
        appointments.map((apt) => (
          <View key={apt.id} style={styles.card}>
            <Text style={styles.service}>{apt.service.name}</Text>
            <Text style={styles.detail}>
              {apt.employee.name} · {new Date(apt.startTime).toLocaleString("pt-BR")}
            </Text>
            <View style={styles.row}>
              <View style={styles.statusBadge}>
                <Text style={styles.status}>{STATUS[apt.status] || apt.status}</Text>
              </View>
              {(apt.status === "SCHEDULED" || apt.status === "CONFIRMED") && (
                <TouchableOpacity onPress={() => cancel(apt.id)}>
                  <Text style={styles.cancelBtn}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  loading: { color: "#888", textAlign: "center", marginTop: 40 },
  empty: { color: "#666", textAlign: "center", marginTop: 32 },
  card: { backgroundColor: "#1a1a2e", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#333" },
  service: { fontSize: 16, fontWeight: "600", color: "#fff" },
  detail: { fontSize: 14, color: "#888", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  statusBadge: { backgroundColor: "#e9456020", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  status: { color: "#e94560", fontSize: 12, fontWeight: "500" },
  cancelBtn: { color: "#ef4444", fontSize: 13 },
});

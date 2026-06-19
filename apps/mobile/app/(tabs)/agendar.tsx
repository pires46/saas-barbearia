import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useApp } from "../../context/app-context";
import { Redirect } from "expo-router";

export default function AgendarScreen() {
  const { session, apiUrl } = useApp();
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<any>(null);
  const [selectedService, setSelectedService] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<any[]>([]);

  if (!session) return <Redirect href="/" />;

  useEffect(() => {
    fetch(`${apiUrl}/api/public/${session.slug}`)
      .then((r) => r.json())
      .then(setTenant)
      .catch(() => Alert.alert("Erro", "Não foi possível carregar a barbearia"));
  }, [session.slug]);

  useEffect(() => {
    if (tenant && selectedService && selectedDate) {
      const params = new URLSearchParams({
        tenantId: tenant.id,
        date: selectedDate,
        serviceId: selectedService,
      });
      if (selectedEmployee) params.set("employeeId", selectedEmployee);
      fetch(`${apiUrl}/api/appointments/available?${params}`)
        .then((r) => r.json())
        .then(setSlots);
    }
  }, [tenant, selectedService, selectedDate, selectedEmployee]);

  const confirm = async () => {
    const slot = slots.find((s) => s.time === selectedTime);
    if (!slot) return;
    const res = await fetch(`${apiUrl}/api/public/${session.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: session.name,
        phone: session.phone,
        serviceId: selectedService,
        employeeId: slot.employeeId,
        date: selectedDate,
        time: selectedTime,
      }),
    });
    if (res.ok) {
      Alert.alert("Sucesso!", "Agendamento confirmado!");
      setStep(1);
      setSelectedTime("");
    } else {
      Alert.alert("Erro", "Não foi possível agendar");
    }
  };

  if (!tenant) return <View style={styles.container}><Text style={styles.loading}>Carregando...</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.step}>Passo {step} de 4</Text>

      {step === 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escolha o serviço</Text>
          {tenant.services?.map((s: any) => (
            <TouchableOpacity key={s.id} style={styles.option} onPress={() => { setSelectedService(s.id); setStep(2); }}>
              <Text style={styles.optionText}>{s.name}</Text>
              <Text style={styles.price}>R$ {s.price.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Escolha o barbeiro</Text>
          <TouchableOpacity style={styles.option} onPress={() => { setSelectedEmployee(""); setStep(3); }}>
            <Text style={styles.optionText}>Qualquer disponível</Text>
          </TouchableOpacity>
          {tenant.employees?.map((e: any) => (
            <TouchableOpacity key={e.id} style={styles.option} onPress={() => { setSelectedEmployee(e.id); setStep(3); }}>
              <Text style={styles.optionText}>{e.name} ★ {e.rating?.toFixed(1)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data e horário</Text>
          <TextInput style={styles.input} placeholder="Data (AAAA-MM-DD)" placeholderTextColor="#666" value={selectedDate} onChangeText={setSelectedDate} />
          <View style={styles.slotsGrid}>
            {slots.map((s) => (
              <TouchableOpacity key={s.time} style={[styles.slot, selectedTime === s.time && styles.slotActive]} onPress={() => { setSelectedTime(s.time); setStep(4); }}>
                <Text style={styles.slotText}>{s.time}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
        </View>
      )}

      {step === 4 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmar agendamento</Text>
          <Text style={styles.confirmText}>{session.name} · {selectedDate} às {selectedTime}</Text>
          <TouchableOpacity style={styles.confirmBtn} onPress={confirm}><Text style={styles.confirmTextBtn}>Confirmar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(3)}><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a", padding: 16 },
  loading: { color: "#fff", textAlign: "center", marginTop: 40 },
  step: { color: "#888", fontSize: 14, marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#fff", marginBottom: 12 },
  option: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#1a1a2e", borderRadius: 10, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#333" },
  optionText: { color: "#fff", fontSize: 16 },
  price: { color: "#e94560", fontWeight: "600" },
  input: { backgroundColor: "#1a1a2e", borderRadius: 10, padding: 14, color: "#fff", marginBottom: 12, borderWidth: 1, borderColor: "#333" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#333", minWidth: 70, alignItems: "center" },
  slotActive: { borderColor: "#e94560", backgroundColor: "#e9456010" },
  slotText: { color: "#fff" },
  confirmBtn: { backgroundColor: "#e94560", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  confirmTextBtn: { color: "#fff", fontWeight: "600", fontSize: 16 },
  confirmText: { color: "#ccc", marginBottom: 12 },
  backBtn: { marginTop: 12, alignItems: "center" },
  backText: { color: "#888" },
});

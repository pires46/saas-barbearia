"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, DAYS_OF_WEEK, getInitials } from "@saas-barbearia/shared";
import { Scissors, MapPin, Phone, Instagram, Star, Calendar, CheckCircle } from "lucide-react";

interface TenantData {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  services: { id: string; name: string; price: number; duration: number }[];
  employees: { id: string; name: string; bio: string | null; rating: number; totalReviews: number }[];
  businessHours: { dayOfWeek: number; openTime: string; closeTime: string; closed: boolean }[];
}

export default function PublicBarbershopPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<{ time: string; employeeId: string; employeeName: string }[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", consentLgpd: false });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then((r) => r.json())
      .then((d) => { setTenant(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (tenant && selectedService && selectedDate) {
      fetch(`/api/appointments/available?tenantId=${tenant.id}&date=${selectedDate}&serviceId=${selectedService}${selectedEmployee ? `&employeeId=${selectedEmployee}` : ""}`)
        .then((r) => r.json())
        .then(setSlots);
    }
  }, [tenant, selectedService, selectedDate, selectedEmployee]);

  const handleBooking = async () => {
    if (!tenant || !selectedService || !selectedTime || !form.consentLgpd) return;
    const slot = slots.find((s) => s.time === selectedTime);
    if (!slot) return;

    await fetch(`/api/public/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        email: form.email,
        serviceId: selectedService,
        employeeId: slot.employeeId,
        date: selectedDate,
        time: selectedTime,
        consentLgpd: true,
      }),
    });
    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Barbearia não encontrada</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
          <p className="text-muted-foreground">Você receberá uma confirmação por WhatsApp.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-accent" />
            <span className="font-bold text-lg">{tenant.name}</span>
          </div>
          <Button variant="accent" size="sm" onClick={() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" })}>
            <Calendar className="h-4 w-4" /> Agendar
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold">{tenant.name}</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{tenant.description}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          {tenant.address && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {tenant.address}</span>}
          {tenant.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {tenant.phone}</span>}
          {tenant.instagram && <span className="flex items-center gap-1"><Instagram className="h-4 w-4" /> {tenant.instagram}</span>}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Nossa Equipe</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenant.employees.map((emp) => (
            <Card key={emp.id} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent mb-3">
                {getInitials(emp.name)}
              </div>
              <h3 className="font-semibold">{emp.name}</h3>
              <p className="text-sm text-yellow-500 flex items-center justify-center gap-1">
                <Star className="h-3 w-3 fill-current" /> {emp.rating.toFixed(1)} ({emp.totalReviews})
              </p>
              {emp.bio && <p className="text-xs text-muted-foreground mt-1">{emp.bio}</p>}
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Serviços</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {tenant.services.map((s) => (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-sm text-muted-foreground">{s.duration} min</p>
              </div>
              <span className="text-lg font-bold text-accent">{formatCurrency(s.price)}</span>
            </Card>
          ))}
        </div>
      </section>

      <section id="agendar" className="mx-auto max-w-lg px-4 py-8 pb-16">
        <Card className="p-6">
          <CardTitle className="mb-6 text-center text-xl">Agendar Horário Online</CardTitle>

          <div className="mb-4 flex justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-2 w-8 rounded-full ${step >= s ? "bg-accent" : "bg-secondary"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Escolha o serviço</p>
              {tenant.services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s.id); setStep(2); }}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedService === s.id ? "border-accent bg-accent/5" : "border-border hover:bg-secondary"}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-accent">{formatCurrency(s.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Escolha o barbeiro</p>
              <button onClick={() => { setSelectedEmployee(""); setStep(3); }} className="w-full rounded-lg border border-border p-3 text-left hover:bg-secondary">
                Qualquer barbeiro disponível
              </button>
              {tenant.employees.map((e) => (
                <button key={e.id} onClick={() => { setSelectedEmployee(e.id); setStep(3); }} className="w-full rounded-lg border border-border p-3 text-left hover:bg-secondary">
                  {e.name} ★ {e.rating.toFixed(1)}
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Voltar</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Escolha data e horário</p>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              {slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((s) => (
                    <button
                      key={`${s.time}-${s.employeeId}`}
                      onClick={() => { setSelectedTime(s.time); setStep(4); }}
                      className={`rounded-lg border p-2 text-sm ${selectedTime === s.time ? "border-accent bg-accent/5" : "border-border hover:bg-secondary"}`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              ) : selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum horário disponível nesta data</p>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Voltar</Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Seus dados</p>
              <Input placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Telefone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.consentLgpd}
                  onChange={(e) => setForm({ ...form, consentLgpd: e.target.checked })}
                  className="mt-0.5"
                />
                <span>Aceito a política de privacidade e autorizo contato por WhatsApp.</span>
              </label>
              <Button variant="accent" className="w-full" onClick={handleBooking} disabled={!form.name || !form.phone || !form.consentLgpd}>
                Confirmar Agendamento
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>Voltar</Button>
            </div>
          )}
        </Card>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>{tenant.name} · Powered by BarberSaaS</p>
        <p className="mt-1">{slug}.seusistema.com.br</p>
      </footer>
    </div>
  );
}

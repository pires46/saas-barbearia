"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime, APPOINTMENT_STATUS } from "@saas-barbearia/shared";
import { Plus, ChevronLeft, ChevronRight, QrCode } from "lucide-react";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  qrCode: string | null;
  checkedIn: boolean;
  client: { id: string; name: string; phone: string };
  employee: { id: string; name: string };
  service: { id: string; name: string; price: number; duration: number };
}

export default function AgendaPage() {
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    clientId: "",
    employeeId: "",
    serviceId: "",
    startTime: "",
    notes: "",
  });

  const load = () => {
    fetch(`/api/appointments?view=${view}&date=${date}`)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments || []));
  };

  useEffect(() => {
    load();
  }, [view, date]);

  useEffect(() => {
    if (showForm) {
      Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/employees").then((r) => r.json()),
        fetch("/api/services").then((r) => r.json()),
      ]).then(([c, e, s]) => {
        setClients(c);
        setEmployees(e);
        setServices(s);
      });
    }
  }, [showForm]);

  const changeDate = (delta: number) => {
    const d = new Date(date);
    if (view === "day") d.setDate(d.getDate() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setDate(d.toISOString().split("T")[0]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = `${date}T${form.startTime}:00`;
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, startTime }),
    });
    setShowForm(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  const cancelAppointment = async (id: string) => {
    if (!confirm("Cancelar agendamento?")) return;
    await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
    load();
  };

  const checkIn = async (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt?.qrCode) return;
    await fetch("/api/appointments/extras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "checkin", qrCode: apt.qrCode }),
    });
    load();
  };

  const statusVariant = (s: string) => {
    const map: Record<string, "info" | "success" | "warning" | "danger" | "accent"> = {
      SCHEDULED: "info",
      CONFIRMED: "info",
      IN_PROGRESS: "warning",
      COMPLETED: "success",
      CANCELLED: "danger",
      NO_SHOW: "danger",
    };
    return map[s] || "default";
  };

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Gerencie agendamentos diários, semanais e mensais"
        actions={
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Novo Agendamento
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm capitalize ${
                view === v ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
              } ${v === "day" ? "rounded-l-lg" : ""} ${v === "month" ? "rounded-r-lg" : ""}`}
            >
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
              <option value="">Barbeiro</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
            <Select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required>
              <option value="">Serviço</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
            <Input
              placeholder="Observações"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {appointments.length === 0 ? (
          <Card className="text-center text-muted-foreground py-8">
            Nenhum agendamento neste período
          </Card>
        ) : (
          appointments.map((apt) => (
            <Card key={apt.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{apt.client.name}</span>
                  <Badge variant={statusVariant(apt.status)}>
                    {APPOINTMENT_STATUS[apt.status as keyof typeof APPOINTMENT_STATUS]}
                  </Badge>
                  {apt.checkedIn && <Badge variant="success">Check-in ✓</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(apt.startTime)} · {apt.employee.name} · {apt.service.name} · {formatCurrency(apt.service.price)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!apt.checkedIn && apt.status !== "CANCELLED" && (
                  <Button size="sm" variant="outline" onClick={() => checkIn(apt.id)}>
                    <QrCode className="h-3 w-3" /> Check-in
                  </Button>
                )}
                {apt.status === "SCHEDULED" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "CONFIRMED")}>
                    Confirmar
                  </Button>
                )}
                {(apt.status === "CONFIRMED" || apt.status === "IN_PROGRESS") && (
                  <Button size="sm" variant="accent" onClick={() => updateStatus(apt.id, "COMPLETED")}>
                    Concluir
                  </Button>
                )}
                {apt.status !== "CANCELLED" && apt.status !== "COMPLETED" && (
                  <Button size="sm" variant="destructive" onClick={() => cancelAppointment(apt.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, getInitials } from "@saas-barbearia/shared";
import { Plus, Star, Calendar } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  serviceCommission: number;
  productCommission: number;
  rating: number;
  totalReviews: number;
  monthAppointments: number;
  monthRevenue: number;
  monthCommission: number;
  services: { service: { name: string } }[];
  absences: { type: string; startDate: string; endDate: string }[];
}

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showAbsence, setShowAbsence] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", cpf: "", role: "BARBER" });
  const [absenceForm, setAbsenceForm] = useState({ startDate: "", endDate: "", reason: "", absenceType: "DAY_OFF" });

  const load = () => fetch("/api/employees").then((r) => r.json()).then(setEmployees);
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    load();
  };

  const handleAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: showAbsence, type: "absence", ...absenceForm }),
    });
    setShowAbsence(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Funcionários"
        description="Gestão de barbeiros e equipe"
        actions={
          <Button variant="accent" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Novo Funcionário
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="BARBER">Barbeiro</option>
              <option value="RECEPTIONIST">Recepcionista</option>
              <option value="MANAGER">Gerente</option>
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {showAbsence && (
        <Card className="mb-6">
          <CardTitle className="mb-3">Registrar Folga/Férias</CardTitle>
          <form onSubmit={handleAbsence} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select className="h-10 rounded-lg border border-border bg-background px-3 text-sm" value={absenceForm.absenceType} onChange={(e) => setAbsenceForm({ ...absenceForm, absenceType: e.target.value })}>
              <option value="DAY_OFF">Folga</option>
              <option value="VACATION">Férias</option>
              <option value="SICK">Atestado</option>
            </select>
            <Input type="date" value={absenceForm.startDate} onChange={(e) => setAbsenceForm({ ...absenceForm, startDate: e.target.value })} required />
            <Input type="date" value={absenceForm.endDate} onChange={(e) => setAbsenceForm({ ...absenceForm, endDate: e.target.value })} required />
            <Input placeholder="Motivo" value={absenceForm.reason} onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })} />
            <div className="flex gap-2">
              <Button type="submit" variant="accent">Salvar</Button>
              <Button type="button" variant="outline" onClick={() => setShowAbsence(null)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => (
          <Card key={emp.id}>
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
                {getInitials(emp.name)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{emp.name}</h3>
                <div className="flex items-center gap-1 text-sm text-yellow-500">
                  <Star className="h-3 w-3 fill-current" />
                  {emp.rating.toFixed(1)} ({emp.totalReviews})
                </div>
                <Badge className="mt-1">{emp.role === "BARBER" ? "Barbeiro" : emp.role === "MANAGER" ? "Gerente" : "Recepcionista"}</Badge>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span>Atendimentos: {emp.monthAppointments}</span>
              <span>Faturamento: {formatCurrency(emp.monthRevenue)}</span>
              <span>Comissão: {formatCurrency(emp.monthCommission)}</span>
              <span>Serv. Com.: {emp.serviceCommission}%</span>
            </div>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setShowAbsence(emp.id)}>
              <Calendar className="h-3 w-3" /> Folga / Férias
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

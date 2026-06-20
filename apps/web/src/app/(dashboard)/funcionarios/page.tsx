"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DAYS_OF_WEEK, formatCurrency, getInitials } from "@saas-barbearia/shared";
import { addMonthsToDate, formatLocalDate, generateDatesInRange } from "@/lib/employee-schedules";
import { Plus, Star, Calendar, Clock, Trash2, X, CheckCircle2 } from "lucide-react";

type ScheduleRow = { dayOfWeek: number; startTime: string; endTime: string; off: boolean };

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
  schedules: { dayOfWeek: number; startTime: string; endTime: string; off?: boolean }[];
  absences: { id: string; type: string; startDate: string; endDate: string; reason?: string | null }[];
}

const WEEKDAY_PRESETS = [
  { label: "Fim de semana", days: [0, 6] },
  { label: "Todos domingos", days: [0] },
  { label: "Todos sábados", days: [6] },
  { label: "Seg–Sex", days: [1, 2, 3, 4, 5] },
];

const WEEKLY_OFF_PRESETS = WEEKDAY_PRESETS.filter((p) => p.label !== "Seg–Sex");

function defaultScheduleRows(existing: Employee["schedules"]): ScheduleRow[] {
  const base = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: dayOfWeek === 6 ? "18:00" : "19:00",
    off: dayOfWeek === 0,
  }));

  if (existing.length === 0) return base;

  return base.map((row) => {
    const found = existing.find((s) => s.dayOfWeek === row.dayOfWeek);
    if (!found) return { ...row, off: true };
    return {
      dayOfWeek: row.dayOfWeek,
      startTime: found.startTime,
      endTime: found.endTime,
      off: found.off ?? false,
    };
  });
}

function absenceLabel(type: string) {
  if (type === "VACATION") return "Férias";
  if (type === "SICK") return "Atestado";
  return "Folga";
}

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSchedule, setShowSchedule] = useState<string | null>(null);
  const [showAbsence, setShowAbsence] = useState<string | null>(null);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", cpf: "", role: "BARBER" });

  const [absenceMode, setAbsenceMode] = useState<"weekly" | "period" | "dates">("weekly");
  const [absenceForm, setAbsenceForm] = useState({
    startDate: "",
    endDate: "",
    absenceType: "DAY_OFF",
    reason: "",
    weekdays: [] as number[],
    extraDates: [] as string[],
    newDate: "",
  });
  const [absenceSaving, setAbsenceSaving] = useState(false);
  const [absenceMessage, setAbsenceMessage] = useState<string | null>(null);

  const load = () => fetch("/api/employees").then((r) => r.json()).then(setEmployees);
  useEffect(() => { load(); }, []);

  const openSchedule = (emp: Employee) => {
    setShowAbsence(null);
    setShowSchedule(emp.id);
    setScheduleRows(defaultScheduleRows(emp.schedules));
    setScheduleSaved(false);
  };

  const openAbsence = (emp: Employee) => {
    setShowSchedule(null);
    setShowAbsence(emp.id);
    setScheduleRows(defaultScheduleRows(emp.schedules));
    setAbsenceMode("weekly");
    const today = formatLocalDate(new Date());
    setAbsenceForm({
      startDate: today,
      endDate: addMonthsToDate(today, 12),
      absenceType: "DAY_OFF",
      reason: "",
      weekdays: [],
      extraDates: [],
      newDate: "",
    });
    setAbsenceMessage(null);
    setScheduleSaved(false);
  };

  const saveSchedules = async (employeeId: string) => {
    setScheduleSaving(true);
    setScheduleSaved(false);

    const res = await fetch("/api/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: employeeId, type: "schedules", schedules: scheduleRows }),
    });

    setScheduleSaving(false);
    if (res.ok) {
      setScheduleSaved(true);
      load();
      setTimeout(() => setScheduleSaved(false), 3000);
      return true;
    }
    return false;
  };

  const toggleWeekday = (day: number) => {
    setAbsenceForm((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((d) => d !== day)
        : [...prev.weekdays, day].sort(),
    }));
  };

  const applyWeeklyPreset = (days: number[]) => {
    setScheduleRows((prev) =>
      prev.map((row) => ({
        ...row,
        off: days.includes(row.dayOfWeek) ? true : row.off,
      }))
    );
    setAbsenceMessage(`Folga fixa marcada para: ${days.map((d) => DAYS_OF_WEEK[d]).join(", ")}. Clique em Salvar.`);
  };

  const applyPeriodPreset = (days: number[]) => {
    const start = absenceForm.startDate || formatLocalDate(new Date());
    const end = absenceForm.endDate || addMonthsToDate(start, 12);
    setAbsenceForm((prev) => ({
      ...prev,
      weekdays: days,
      startDate: start,
      endDate: end,
    }));
  };

  const addExtraDate = () => {
    if (!absenceForm.newDate || absenceForm.extraDates.includes(absenceForm.newDate)) return;
    setAbsenceForm((prev) => ({
      ...prev,
      extraDates: [...prev.extraDates, prev.newDate].sort(),
      newDate: "",
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", phone: "", cpf: "", role: "BARBER" });
    load();
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSchedule) return;
    await saveSchedules(showSchedule);
  };

  const handleSaveWeeklyAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAbsence) return;
    const ok = await saveSchedules(showAbsence);
    if (ok) setAbsenceMessage("Folgas fixas salvas! Válidas todos os dias marcados.");
  };

  const periodPreview =
    absenceMode === "period" && absenceForm.startDate && absenceForm.endDate && absenceForm.weekdays.length > 0
      ? generateDatesInRange(absenceForm.startDate, absenceForm.endDate, absenceForm.weekdays)
      : [];

  const renderScheduleEditor = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-2">
      {scheduleRows.map((row, i) => (
        <div key={row.dayOfWeek} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-24 font-medium">{DAYS_OF_WEEK[row.dayOfWeek]}</span>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={row.off}
              onChange={(e) => {
                const next = [...scheduleRows];
                next[i] = { ...row, off: e.target.checked };
                setScheduleRows(next);
              }}
            />
            Folga fixa
          </label>
          {!row.off && (
            <>
              <Input
                type="time"
                value={row.startTime}
                onChange={(e) => {
                  const next = [...scheduleRows];
                  next[i] = { ...row, startTime: e.target.value };
                  setScheduleRows(next);
                }}
                className="w-auto"
              />
              <span>às</span>
              <Input
                type="time"
                value={row.endTime}
                onChange={(e) => {
                  const next = [...scheduleRows];
                  next[i] = { ...row, endTime: e.target.value };
                  setScheduleRows(next);
                }}
                className="w-auto"
              />
            </>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        {WEEKLY_OFF_PRESETS.map((preset) => (
          <Button key={preset.label} type="button" size="sm" variant="outline" onClick={() => applyWeeklyPreset(preset.days)}>
            {preset.label}
          </Button>
        ))}
      </div>
      {(scheduleSaved || absenceMessage?.includes("Folgas fixas")) && (
        <p className="flex items-center gap-2 text-sm text-green-500">
          <CheckCircle2 className="h-4 w-4" /> Salvo com sucesso!
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" variant="accent" disabled={scheduleSaving}>
          {scheduleSaving ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );

  const handleAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAbsence) return;
    setAbsenceSaving(true);
    setAbsenceMessage(null);

    const payload: Record<string, unknown> = {
      id: showAbsence,
      type: "absence",
      absenceType: absenceForm.absenceType,
      reason: absenceForm.reason,
    };

    if (absenceMode === "period") {
      payload.startDate = absenceForm.startDate;
      payload.endDate = absenceForm.endDate || absenceForm.startDate;
      payload.weekdays = absenceForm.weekdays;
    } else if (absenceMode === "dates") {
      payload.dates = absenceForm.extraDates;
    }

    const res = await fetch("/api/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setAbsenceSaving(false);

    if (!res.ok) {
      setAbsenceMessage(data.error || "Erro ao registrar folgas");
      return;
    }

    setAbsenceMessage(`${data.created} dia(s) registrado(s) com sucesso!`);
    load();
  };

  const deleteAbsence = async (employeeId: string, absenceId: string) => {
    if (!confirm("Remover esta folga?")) return;
    await fetch("/api/employees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: employeeId, type: "absence-delete", absenceId }),
    });
    load();
  };

  const selectedEmployee = employees.find((e) => e.id === showSchedule || e.id === showAbsence);

  return (
    <div>
      <PageHeader
        title="Funcionários"
        description="Gestão de barbeiros, horários e folgas"
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

      {showSchedule && selectedEmployee && (
        <Card className="mb-6">
          <CardTitle className="mb-1">Horários — {selectedEmployee.name}</CardTitle>
          <p className="mb-4 text-sm text-muted-foreground">
            Defina em quais dias e horários este profissional atende.
          </p>
          {renderScheduleEditor(handleSaveSchedule, "Salvar horários")}
          <Button type="button" variant="outline" className="mt-2" onClick={() => setShowSchedule(null)}>Fechar</Button>
        </Card>
      )}

      {showAbsence && selectedEmployee && (
        <Card className="mb-6">
          <CardTitle className="mb-1">Folgas / Férias — {selectedEmployee.name}</CardTitle>
          <p className="mb-4 text-sm text-muted-foreground">
            Use <strong>Folga fixa semanal</strong> para domingos/sábados recorrentes (igual Horários). Use período para férias ou dias específicos.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={absenceMode === "weekly" ? "accent" : "outline"}
              onClick={() => setAbsenceMode("weekly")}
            >
              Folga fixa semanal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={absenceMode === "period" ? "accent" : "outline"}
              onClick={() => setAbsenceMode("period")}
            >
              Por período (férias)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={absenceMode === "dates" ? "accent" : "outline"}
              onClick={() => setAbsenceMode("dates")}
            >
              Dias avulsos
            </Button>
          </div>

          {absenceMode === "weekly" ? (
            <>
              {renderScheduleEditor(handleSaveWeeklyAbsence, "Salvar folgas fixas")}
              {absenceMessage && !absenceMessage.includes("Salvo") && (
                <p className="mt-2 text-sm text-muted-foreground">{absenceMessage}</p>
              )}
            </>
          ) : (
          <form onSubmit={handleAbsence} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                value={absenceForm.absenceType}
                onChange={(e) => setAbsenceForm({ ...absenceForm, absenceType: e.target.value })}
              >
                <option value="DAY_OFF">Folga</option>
                <option value="VACATION">Férias</option>
                <option value="SICK">Atestado</option>
              </select>
              <Input
                placeholder="Motivo (opcional)"
                value={absenceForm.reason}
                onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                className="sm:col-span-2"
              />
            </div>

            {absenceMode === "period" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">De</label>
                    <Input
                      type="date"
                      value={absenceForm.startDate}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Até</label>
                    <Input
                      type="date"
                      value={absenceForm.endDate}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Quais dias da semana nesse período?</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((label, day) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleWeekday(day)}
                        className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                          absenceForm.weekdays.includes(day)
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/40"
                        }`}
                      >
                        {label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_PRESETS.map((preset) => (
                    <Button key={preset.label} type="button" size="sm" variant="outline" onClick={() => applyPeriodPreset(preset.days)}>
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {periodPreview.length > 0 && (
                  <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                    Serão registrados <strong>{periodPreview.length}</strong> dia(s) entre{" "}
                    {new Date(`${absenceForm.startDate}T12:00:00`).toLocaleDateString("pt-BR")} e{" "}
                    {new Date(`${absenceForm.endDate}T12:00:00`).toLocaleDateString("pt-BR")}.
                  </p>
                )}
              </>
            ) : (
              <div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={absenceForm.newDate}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, newDate: e.target.value })}
                    className="w-auto"
                  />
                  <Button type="button" variant="outline" onClick={addExtraDate}>
                    <Plus className="h-4 w-4" /> Adicionar dia
                  </Button>
                </div>
                {absenceForm.extraDates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {absenceForm.extraDates.map((date) => (
                      <span key={date} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                        {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}
                        <button
                          type="button"
                          onClick={() =>
                            setAbsenceForm((prev) => ({
                              ...prev,
                              extraDates: prev.extraDates.filter((d) => d !== date),
                            }))
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {absenceMessage && (
              <p className={`text-sm ${absenceMessage.includes("sucesso") ? "text-green-500" : "text-red-400"}`}>
                {absenceMessage}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="accent" disabled={absenceSaving}>
                {absenceSaving ? "Salvando..." : "Registrar folgas"}
              </Button>
            </div>
          </form>
          )}

          <Button type="button" variant="outline" className="mt-2" onClick={() => setShowAbsence(null)}>Fechar</Button>

          {selectedEmployee.schedules.some((s) => s.off) && (
            <div className="mt-4 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
              <span className="font-medium">Folga fixa ativa: </span>
              {selectedEmployee.schedules.filter((s) => s.off).map((s) => DAYS_OF_WEEK[s.dayOfWeek]).join(", ")}
            </div>
          )}

          {selectedEmployee.absences.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium">Folgas em datas específicas</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {selectedEmployee.absences
                  .slice()
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((abs) => (
                    <div key={abs.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>
                        {new Date(abs.startDate).toLocaleDateString("pt-BR")} — {absenceLabel(abs.type)}
                        {abs.reason ? ` (${abs.reason})` : ""}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-red-400"
                        onClick={() => deleteAbsence(selectedEmployee.id, abs.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
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
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {emp.schedules.length === 0 ? (
                <span>Sem horários — clique em Horários para configurar</span>
              ) : (
                <>
                  {emp.schedules.filter((s) => s.off).length > 0 && (
                    <span className="block text-amber-500/90">
                      Folga fixa: {emp.schedules.filter((s) => s.off).map((s) => DAYS_OF_WEEK[s.dayOfWeek].slice(0, 3)).join(", ")}
                    </span>
                  )}
                  {emp.schedules.filter((s) => !s.off).slice(0, 3).map((s) => (
                    <span key={s.dayOfWeek} className="block">
                      {DAYS_OF_WEEK[s.dayOfWeek].slice(0, 3)}: {s.startTime}–{s.endTime}
                    </span>
                  ))}
                </>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => openSchedule(emp)}>
                <Clock className="h-3 w-3" /> Horários
              </Button>
              <Button size="sm" variant="outline" onClick={() => openAbsence(emp)}>
                <Calendar className="h-3 w-3" /> Folgas
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

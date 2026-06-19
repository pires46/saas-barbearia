export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string | null;
}

export interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  monthRevenue: number;
  newClients: number;
  recurringClients: number;
}

export interface ChartData {
  label: string;
  value: number;
}

export interface AvailableSlot {
  time: string;
  employeeId: string;
  employeeName: string;
}

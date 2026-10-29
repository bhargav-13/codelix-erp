/**
 * HR demo module (modelled on Ishita HRMS): employees, shifts, daily
 * attendance from a simulated face-punch device, leave and payroll.
 * Static — data lives in the browser via demoStore.
 */
import { collection } from './demoStore';

export type Category = 'REGULAR' | 'CONTRACTOR' | 'WORK_BASIS';

export interface Shift {
  id: number;
  name: string;
  start: string; // HH:mm
  end: string;
  graceMinutes: number;
  weeklyOff: number; // 0 = Sunday
}

export interface Employee {
  id: number;
  code: string;
  name: string;
  phone: string;
  department: string;
  designation: string;
  category: Category;
  shiftId: number;
  joinDate: string;
  monthlySalary: number;
  active: boolean;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE' | 'WEEK_OFF';

export interface Attendance {
  id: number;
  employeeId: number;
  date: string; // yyyy-mm-dd
  inTime?: string;
  outTime?: string;
  status: AttendanceStatus;
  source: 'FACE' | 'MANUAL';
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  type: 'Casual' | 'Sick' | 'Earned';
  from: string;
  to: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const DEPARTMENTS = ['Production', 'Forging', 'Plating', 'Quality', 'Dispatch', 'Accounts', 'Maintenance'];

// Deterministic pseudo-random so every reset produces the same believable data.
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export const iso = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

const FIRST = ['Ramesh', 'Suresh', 'Mahesh', 'Kiran', 'Vijay', 'Anil', 'Prakash', 'Dinesh', 'Jignesh', 'Hitesh', 'Nilesh', 'Paresh',
  'Bhavesh', 'Ketan', 'Mitesh', 'Pooja', 'Hetal', 'Komal', 'Nisha', 'Rekha', 'Sanjay', 'Ashok', 'Deepak', 'Manoj'];
const LAST = ['Patel', 'Shah', 'Solanki', 'Parmar', 'Chauhan', 'Rathod', 'Vaghela', 'Makwana', 'Joshi', 'Desai', 'Mehta', 'Gohil'];
const DESIG: Record<string, string[]> = {
  Production: ['Machine Operator', 'Line Supervisor', 'Helper'],
  Forging: ['Forging Operator', 'Hammer Man', 'Furnace Operator'],
  Plating: ['Plating Operator', 'Chemist'],
  Quality: ['QC Inspector', 'QC Head'],
  Dispatch: ['Packer', 'Dispatch Incharge'],
  Accounts: ['Accountant', 'Billing Executive'],
  Maintenance: ['Electrician', 'Fitter'],
};

export const shifts = collection<Shift>('hr.shifts', () => [
  { id: 1, name: 'General', start: '09:00', end: '18:00', graceMinutes: 15, weeklyOff: 0 },
  { id: 2, name: 'Morning', start: '07:00', end: '15:00', graceMinutes: 10, weeklyOff: 0 },
  { id: 3, name: 'Night', start: '20:00', end: '04:00', graceMinutes: 10, weeklyOff: 6 },
]);

export const employees = collection<Employee>('hr.employees', () => {
  const r = rng(42);
  return Array.from({ length: 28 }, (_, i) => {
    const dept = DEPARTMENTS[Math.floor(r() * DEPARTMENTS.length)];
    const desig = DESIG[dept][Math.floor(r() * DESIG[dept].length)];
    const join = new Date();
    join.setDate(join.getDate() - Math.floor(60 + r() * 1500));
    return {
      id: i + 1,
      code: `EMP${String(101 + i)}`,
      name: `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`,
      phone: `9${Math.floor(100000000 + r() * 899999999)}`,
      department: dept,
      designation: desig,
      category: (r() < 0.75 ? 'REGULAR' : r() < 0.5 ? 'CONTRACTOR' : 'WORK_BASIS') as Category,
      shiftId: r() < 0.6 ? 1 : r() < 0.7 ? 2 : 3,
      joinDate: iso(join),
      monthlySalary: Math.round((12000 + r() * 28000) / 500) * 500,
      active: r() > 0.06,
    };
  });
});

const pad = (n: number) => String(n).padStart(2, '0');
const addMinutes = (hhmm: string, m: number) => {
  const [h, mi] = hhmm.split(':').map(Number);
  const t = (((h * 60 + mi + m) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

export const attendance = collection<Attendance>('hr.attendance', () => {
  const r = rng(7);
  const emps = employees.all();
  const shiftList = shifts.all();
  const rows: Attendance[] = [];
  let id = 1;
  const today = new Date();
  for (let back = 75; back >= 1; back--) {
    const day = new Date(today);
    day.setDate(today.getDate() - back);
    const date = iso(day);
    for (const e of emps) {
      if (!e.active) continue;
      const shift = shiftList.find(s => s.id === e.shiftId) ?? shiftList[0];
      if (day.getDay() === shift.weeklyOff) {
        rows.push({ id: id++, employeeId: e.id, date, status: 'WEEK_OFF', source: 'FACE' });
        continue;
      }
      const roll = r();
      if (roll < 0.05) { rows.push({ id: id++, employeeId: e.id, date, status: 'ABSENT', source: 'FACE' }); continue; }
      if (roll < 0.08) { rows.push({ id: id++, employeeId: e.id, date, status: 'LEAVE', source: 'MANUAL' }); continue; }
      const late = roll > 0.86 ? Math.floor(20 + r() * 40) : Math.floor(-10 + r() * 14);
      const half = roll > 0.97;
      rows.push({
        id: id++,
        employeeId: e.id,
        date,
        inTime: addMinutes(shift.start, late),
        outTime: addMinutes(shift.end, half ? -240 : Math.floor(r() * 50) - 5),
        status: half ? 'HALF_DAY' : late > shift.graceMinutes ? 'LATE' : 'PRESENT',
        source: 'FACE',
      });
    }
  }
  return rows;
});

export const leaves = collection<LeaveRequest>('hr.leaves', () => {
  const d = (offset: number) => { const x = new Date(); x.setDate(x.getDate() + offset); return iso(x); };
  return [
    { id: 1, employeeId: 3, type: 'Casual', from: d(2), to: d(3), reason: 'Family function', status: 'PENDING' },
    { id: 2, employeeId: 8, type: 'Sick', from: d(-1), to: d(0), reason: 'Fever', status: 'PENDING' },
    { id: 3, employeeId: 12, type: 'Earned', from: d(10), to: d(14), reason: 'Native place visit', status: 'APPROVED' },
    { id: 4, employeeId: 5, type: 'Casual', from: d(-12), to: d(-12), reason: 'Bank work', status: 'APPROVED' },
    { id: 5, employeeId: 19, type: 'Sick', from: d(-20), to: d(-18), reason: 'Back pain', status: 'REJECTED' },
  ];
});

/** Record a punch from the kiosk: first punch of the day is IN, the next is OUT. */
export function punch(employeeId: number, at = new Date()) {
  const date = iso(at);
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const existing = attendance.all().find(a => a.employeeId === employeeId && a.date === date);
  if (existing?.inTime && !existing.outTime) {
    attendance.update(existing.id, { outTime: time });
    return 'OUT' as const;
  }
  if (existing?.inTime) return 'DONE' as const;
  const emp = employees.get(employeeId);
  const shift = shifts.get(emp?.shiftId ?? 1) ?? shifts.all()[0];
  const [h, m] = shift.start.split(':').map(Number);
  const lateBy = at.getHours() * 60 + at.getMinutes() - (h * 60 + m);
  const status: AttendanceStatus = lateBy > shift.graceMinutes ? 'LATE' : 'PRESENT';
  if (existing) attendance.update(existing.id, { inTime: time, status, source: 'FACE' });
  else attendance.create({ employeeId, date, inTime: time, status, source: 'FACE' });
  return 'IN' as const;
}

export interface PayslipLine {
  employee: Employee;
  present: number;
  late: number;
  halfDays: number;
  leave: number;
  weekOff: number;
  absent: number;
  payableDays: number;
  gross: number;
  pf: number;
  esic: number;
  pt: number;
  net: number;
}

/** Payroll for a calendar month computed from attendance — same rules as Ishita HRMS, simplified. */
export function computePayroll(year: number, month: number, emps: Employee[], att: Attendance[]): PayslipLine[] {
  const prefix = `${year}-${pad(month + 1)}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return emps.filter(e => e.active).map(employee => {
    const rows = att.filter(a => a.employeeId === employee.id && a.date.startsWith(prefix));
    const count = (s: AttendanceStatus) => rows.filter(a => a.status === s).length;
    const present = count('PRESENT');
    const late = count('LATE');
    const halfDays = count('HALF_DAY');
    const leave = count('LEAVE');
    const weekOff = count('WEEK_OFF');
    const absent = count('ABSENT');
    const payableDays = present + late + halfDays * 0.5 + leave + weekOff;
    const gross = Math.round((employee.monthlySalary / daysInMonth) * payableDays);
    const statutory = employee.category === 'REGULAR';
    const pf = statutory ? Math.round(Math.min(gross * 0.5, 15000) * 0.12) : 0;
    const esic = statutory && employee.monthlySalary <= 21000 ? Math.round(gross * 0.0075) : 0;
    const pt = statutory && gross >= 12000 ? 200 : 0;
    return { employee, present, late, halfDays, leave, weekOff, absent, payableDays, gross, pf, esic, pt, net: gross - pf - esic - pt };
  });
}

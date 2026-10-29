import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { attendance, computePayroll, employees, type PayslipLine } from '../../data/hr';
import { useSettings } from '../../settings';
import { Button, Card, DataTable, Drawer, PageHeader, Stat, inr, num } from '../../ui';

const monthLabel = (ym: string) => new Date(`${ym}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const Payroll: React.FC = () => {
  const emps = employees.use();
  const att = attendance.use();
  const { settings } = useSettings();
  const lastMonth = (() => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 7); })();
  const [month, setMonth] = useState(lastMonth);
  const [slip, setSlip] = useState<PayslipLine | null>(null);

  const lines = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return computePayroll(y, m - 1, emps, att);
  }, [month, emps, att]);

  const sum = (k: keyof PayslipLine) => lines.reduce((s, l) => s + (l[k] as number), 0);

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle={`Calculated from attendance for ${monthLabel(month)}.`}
        actions={<input type="month" className="field h-9 w-[170px]" value={month} onChange={e => setMonth(e.target.value)} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Employees paid" value={lines.length} />
        <Stat label="Gross salary" value={inr(sum('gross'))} />
        <Stat label="Deductions (PF · ESIC · PT)" value={inr(sum('pf') + sum('esic') + sum('pt'))} />
        <Stat label="Net payable" value={inr(sum('net'))} />
      </div>
      <Card>
        <DataTable
          rows={lines}
          pageSize={15}
          onRowClick={setSlip}
          columns={[
            { key: 'e', header: 'Employee', render: l => <><div className="font-medium">{l.employee.name}</div><div className="text-[12px] text-ink-3">{l.employee.code} · {l.employee.department}</div></> },
            { key: 'p', header: 'Present', align: 'right', render: l => l.present + l.late },
            { key: 'h', header: 'Half', align: 'right', render: l => l.halfDays },
            { key: 'a', header: 'Absent', align: 'right', render: l => l.absent },
            { key: 'd', header: 'Payable days', align: 'right', render: l => num(l.payableDays, 1) },
            { key: 'g', header: 'Gross', align: 'right', render: l => inr(l.gross) },
            { key: 'x', header: 'Deductions', align: 'right', render: l => inr(l.pf + l.esic + l.pt) },
            { key: 'n', header: 'Net pay', align: 'right', render: l => <span className="font-semibold">{inr(l.net)}</span> },
          ]}
        />
      </Card>

      <Drawer
        open={!!slip}
        title="Salary slip"
        onClose={() => setSlip(null)}
        wide
        footer={<Button variant="outline" icon={<Printer size={15} />} onClick={() => window.print()}>Print</Button>}
      >
        {slip && (
          <div id="payslip" className="rounded-xl border border-line p-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <div className="text-[18px] font-semibold">{settings.companyName}</div>
                <div className="text-ink-3">Salary slip · {monthLabel(month)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{slip.employee.name}</div>
                <div className="text-[12px] text-ink-3">{slip.employee.code} · {slip.employee.designation}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 py-4 text-center sm:grid-cols-6">
              {([['Present', slip.present + slip.late], ['Half day', slip.halfDays], ['Leave', slip.leave], ['Week off', slip.weekOff], ['Absent', slip.absent], ['Payable', slip.payableDays]] as const).map(([l, v]) => (
                <div key={l} className="rounded-lg bg-muted p-2"><div className="text-[11px] text-ink-3">{l}</div><div className="font-semibold">{num(v, 1)}</div></div>
              ))}
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">Earnings</div>
                <Row l="Monthly salary" v={slip.employee.monthlySalary} />
                <Row l="Earned for payable days" v={slip.gross} strong />
              </div>
              <div>
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">Deductions</div>
                <Row l="Provident fund" v={slip.pf} />
                <Row l="ESIC" v={slip.esic} />
                <Row l="Professional tax" v={slip.pt} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-lg bg-accent-soft px-4 py-3">
              <span className="font-medium">Net pay</span>
              <span className="text-[20px] font-semibold text-accent">{inr(slip.net)}</span>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

const Row: React.FC<{ l: string; v: number; strong?: boolean }> = ({ l, v, strong }) => (
  <div className="flex justify-between border-b border-line py-1.5 last:border-0">
    <span className="text-ink-2">{l}</span>
    <span className={strong ? 'font-semibold' : ''}>{inr(v)}</span>
  </div>
);

export default Payroll;

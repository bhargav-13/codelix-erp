import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ScanFace } from 'lucide-react';
import { Link } from 'react-router-dom';
import { attendance, employees, iso, type AttendanceStatus } from '../../data/hr';
import { Badge, Button, Card, DataTable, PageHeader, SearchBox, Stat, Tabs, cx, fmtDate, type Tone } from '../../ui';

const STATUS: Record<AttendanceStatus, { label: string; tone: Tone; short: string }> = {
  PRESENT: { label: 'Present', tone: 'green', short: 'P' },
  LATE: { label: 'Late', tone: 'amber', short: 'L' },
  HALF_DAY: { label: 'Half day', tone: 'blue', short: 'H' },
  ABSENT: { label: 'Absent', tone: 'red', short: 'A' },
  LEAVE: { label: 'Leave', tone: 'accent', short: 'LV' },
  WEEK_OFF: { label: 'Week off', tone: 'gray', short: 'WO' },
};

const AttendancePage: React.FC = () => {
  const emps = employees.use();
  const att = attendance.use();
  const [view, setView] = useState('day');
  const [search, setSearch] = useState('');
  const latest = useMemo(() => att.reduce((m, a) => (a.date > m ? a.date : m), iso(new Date(Date.now() - 86400000))), [att]);
  const [date, setDate] = useState(latest);
  const [month, setMonth] = useState(latest.slice(0, 7));

  const shiftDay = (n: number) => { const d = new Date(date); d.setDate(d.getDate() + n); setDate(iso(d)); };

  const active = emps.filter(e => e.active && e.name.toLowerCase().includes(search.toLowerCase()));
  const dayRows = active.map(e => ({ e, a: att.find(a => a.employeeId === e.id && a.date === date) }));
  const count = (s: AttendanceStatus) => dayRows.filter(r => r.a?.status === s).length;

  const [y, m] = month.split('-').map(Number);
  const days = Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const byKey = useMemo(() => new Map(att.map(a => [`${a.employeeId}|${a.date}`, a])), [att]);

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Punches from the face device, updated live."
        actions={<Link to="/hr/kiosk"><Button variant="outline" icon={<ScanFace size={16} />}>Open kiosk</Button></Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onChange={setView} tabs={[{ id: 'day', label: 'Daily' }, { id: 'month', label: 'Monthly register' }]} />
        {view === 'day' ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" icon={<ChevronLeft size={14} />} onClick={() => shiftDay(-1)} />
            <input type="date" className="field h-8 w-[150px]" value={date} onChange={e => setDate(e.target.value)} />
            <Button size="sm" variant="outline" icon={<ChevronRight size={14} />} onClick={() => shiftDay(1)} />
          </div>
        ) : (
          <input type="month" className="field h-8 w-[160px]" value={month} onChange={e => setMonth(e.target.value)} />
        )}
        <div className="ml-auto"><SearchBox value={search} onChange={setSearch} placeholder="Search employee" /></div>
      </div>

      {view === 'day' ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Present" value={count('PRESENT') + count('LATE') + count('HALF_DAY')} hint={`of ${active.length} employees`} />
            <Stat label="Late" value={count('LATE')} />
            <Stat label="On leave" value={count('LEAVE')} />
            <Stat label="Absent / not punched" value={count('ABSENT') + dayRows.filter(r => !r.a).length} />
          </div>
          <Card>
            <DataTable
              rows={dayRows}
              pageSize={15}
              columns={[
                { key: 'n', header: 'Employee', render: r => <><div className="font-medium">{r.e.name}</div><div className="text-[12px] text-ink-3">{r.e.code} · {r.e.department}</div></> },
                { key: 'i', header: 'In', render: r => r.a?.inTime ?? '—' },
                { key: 'o', header: 'Out', render: r => r.a?.outTime ?? '—' },
                { key: 's', header: 'Status', render: r => r.a ? <Badge tone={STATUS[r.a.status].tone}>{STATUS[r.a.status].label}</Badge> : <Badge>Not punched</Badge> },
                { key: 'src', header: 'Source', render: r => r.a ? (r.a.source === 'FACE' ? 'Face device' : 'Manual') : '' },
              ]}
            />
          </Card>
          <p className="mt-3 text-[12px] text-ink-3">{fmtDate(date)}</p>
        </>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="text-[12px]">
              <thead>
                <tr className="border-b border-line text-ink-3">
                  <th className="sticky left-0 bg-surface px-4 py-2 text-left font-medium">Employee</th>
                  {days.map(d => <th key={d} className="px-1 py-2 font-medium">{Number(d.slice(8))}</th>)}
                  <th className="px-3 py-2 font-medium">P</th>
                </tr>
              </thead>
              <tbody>
                {active.map(e => {
                  let p = 0;
                  return (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className="sticky left-0 whitespace-nowrap bg-surface px-4 py-1.5 font-medium">{e.name}</td>
                      {days.map(d => {
                        const a = byKey.get(`${e.id}|${d}`);
                        if (a && ['PRESENT', 'LATE'].includes(a.status)) p += 1;
                        if (a?.status === 'HALF_DAY') p += 0.5;
                        return (
                          <td key={d} className="px-0.5 py-1 text-center">
                            {a ? (
                              <span className={cx('inline-block min-w-[22px] rounded px-0.5 py-0.5 text-[10px] font-semibold',
                                a.status === 'PRESENT' && 'bg-emerald-500/15 text-emerald-600',
                                a.status === 'LATE' && 'bg-amber-500/15 text-amber-700',
                                a.status === 'HALF_DAY' && 'bg-sky-500/15 text-sky-700',
                                a.status === 'ABSENT' && 'bg-red-500/15 text-red-600',
                                a.status === 'LEAVE' && 'bg-accent-soft text-accent',
                                a.status === 'WEEK_OFF' && 'bg-muted text-ink-3')}
                              >{STATUS[a.status].short}</span>
                            ) : <span className="text-ink-3">·</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 text-center font-semibold">{p}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
};

export default AttendancePage;

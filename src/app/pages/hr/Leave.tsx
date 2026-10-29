import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { employees, iso, leaves, type LeaveRequest } from '../../data/hr';
import { Badge, Button, Card, DataTable, Drawer, Field, PageHeader, Stat, Tabs, fmtDate, toast } from '../../ui';

const days = (l: LeaveRequest) => Math.round((new Date(l.to).getTime() - new Date(l.from).getTime()) / 86400000) + 1;

const Leave: React.FC = () => {
  const list = leaves.use();
  const emps = employees.use();
  const [tab, setTab] = useState('PENDING');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<LeaveRequest, 'id'>>({
    employeeId: emps[0]?.id ?? 1, type: 'Casual', from: iso(new Date()), to: iso(new Date()), reason: '', status: 'PENDING',
  });

  const rows = list.filter(l => tab === 'ALL' || l.status === tab);
  const name = (id: number) => emps.find(e => e.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader title="Leave" subtitle="Requests and approvals." actions={<Button icon={<Plus size={16} />} onClick={() => setAdding(true)}>New request</Button>} />
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Waiting for approval" value={list.filter(l => l.status === 'PENDING').length} />
        <Stat label="Approved" value={list.filter(l => l.status === 'APPROVED').length} />
        <Stat label="Upcoming days off" value={list.filter(l => l.status === 'APPROVED' && l.from >= iso(new Date())).reduce((s, l) => s + days(l), 0)} />
      </div>
      <Card>
        <div className="border-b border-line p-4">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'PENDING', label: 'Pending' }, { id: 'APPROVED', label: 'Approved' }, { id: 'REJECTED', label: 'Rejected' }, { id: 'ALL', label: 'All' }]} />
        </div>
        <DataTable
          rows={rows}
          columns={[
            { key: 'e', header: 'Employee', render: l => <span className="font-medium">{name(l.employeeId)}</span> },
            { key: 't', header: 'Type', render: l => l.type },
            { key: 'd', header: 'Dates', render: l => <>{fmtDate(l.from)}{l.to !== l.from && <> – {fmtDate(l.to)}</>} <span className="text-ink-3">· {days(l)}d</span></> },
            { key: 'r', header: 'Reason', render: l => <span className="text-ink-2">{l.reason}</span> },
            {
              key: 's', header: 'Status', align: 'right', render: l => l.status === 'PENDING' ? (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" icon={<Check size={14} />} onClick={() => { leaves.update(l.id, { status: 'APPROVED' }); toast.ok('Leave approved'); }}>Approve</Button>
                  <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => { leaves.update(l.id, { status: 'REJECTED' }); toast.ok('Leave rejected'); }} />
                </div>
              ) : <Badge tone={l.status === 'APPROVED' ? 'green' : 'red'}>{l.status === 'APPROVED' ? 'Approved' : 'Rejected'}</Badge>,
            },
          ]}
        />
      </Card>

      <Drawer
        open={adding}
        title="New leave request"
        onClose={() => setAdding(false)}
        footer={<><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          <Button onClick={() => {
            if (form.to < form.from) { toast.err('End date is before start date'); return; }
            leaves.create(form); setAdding(false); setTab('PENDING'); toast.ok('Request created');
          }}>Submit</Button></>}
      >
        <div className="space-y-4">
          <Field label="Employee">
            <select className="field" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: Number(e.target.value) })}>
              {emps.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
            </select>
          </Field>
          <Field label="Leave type">
            <select className="field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as LeaveRequest['type'] })}>
              <option>Casual</option><option>Sick</option><option>Earned</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="From"><input type="date" className="field" value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} /></Field>
            <Field label="To"><input type="date" className="field" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} /></Field>
          </div>
          <Field label="Reason"><textarea className="field" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></Field>
        </div>
      </Drawer>
    </>
  );
};

export default Leave;

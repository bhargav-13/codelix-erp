import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DEPARTMENTS, employees, iso, shifts, type Category, type Employee } from '../../data/hr';
import { Badge, Button, Card, Confirm, DataTable, Drawer, Field, PageHeader, SearchBox, Tabs, fmtDate, inr, toast } from '../../ui';

const CATEGORY_LABEL: Record<Category, string> = { REGULAR: 'Regular', CONTRACTOR: 'Contractor', WORK_BASIS: 'Work basis' };

const blank = (): Omit<Employee, 'id'> => ({
  code: `EMP${101 + employees.all().length}`,
  name: '', phone: '', department: DEPARTMENTS[0], designation: '', category: 'REGULAR',
  shiftId: 1, joinDate: iso(new Date()), monthlySalary: 15000, active: true,
});

const Employees: React.FC = () => {
  const list = employees.use();
  const shiftList = shifts.use();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [status, setStatus] = useState('active');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(blank);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const rows = useMemo(() => list.filter(e =>
    (status === 'all' || (status === 'active') === e.active) &&
    (dept === 'all' || e.department === dept) &&
    `${e.name} ${e.code} ${e.designation}`.toLowerCase().includes(search.toLowerCase()),
  ), [list, search, dept, status]);

  const payroll = list.filter(e => e.active).reduce((s, e) => s + e.monthlySalary, 0);

  const open = (e: Employee | 'new') => {
    setEditing(e);
    if (e === 'new') setForm(blank());
    else { const { id: _id, ...rest } = e; setForm(rest); }
  };

  const save = () => {
    if (!form.name.trim()) { toast.err('Name is required'); return; }
    if (editing === 'new') employees.create(form);
    else if (editing) employees.update(editing.id, form);
    toast.ok(editing === 'new' ? 'Employee added' : 'Employee updated');
    setEditing(null);
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={`${list.filter(e => e.active).length} active · ${inr(payroll)} monthly salary`}
        actions={<Button icon={<Plus size={16} />} onClick={() => open('new')}>Add employee</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <SearchBox value={search} onChange={setSearch} placeholder="Search name or code" />
          <select className="field max-w-[180px]" value={dept} onChange={e => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
          <div className="ml-auto">
            <Tabs value={status} onChange={setStatus} tabs={[{ id: 'active', label: 'Active' }, { id: 'inactive', label: 'Left' }, { id: 'all', label: 'All' }]} />
          </div>
        </div>
        <DataTable
          rows={rows}
          onRowClick={open}
          columns={[
            {
              key: 'n', header: 'Employee', render: e => (
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
                    {e.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                  </span>
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-[12px] text-ink-3">{e.code} · {e.phone}</div>
                  </div>
                </div>
              ),
            },
            { key: 'd', header: 'Department', render: e => <><div>{e.department}</div><div className="text-[12px] text-ink-3">{e.designation}</div></> },
            { key: 'c', header: 'Type', render: e => <Badge tone={e.category === 'REGULAR' ? 'accent' : 'gray'}>{CATEGORY_LABEL[e.category]}</Badge> },
            { key: 's', header: 'Shift', render: e => shiftList.find(s => s.id === e.shiftId)?.name ?? '—' },
            { key: 'j', header: 'Joined', render: e => fmtDate(e.joinDate) },
            { key: 'p', header: 'Salary', align: 'right', render: e => inr(e.monthlySalary) },
            {
              key: 'a', header: '', align: 'right', render: e => (
                <div className="flex justify-end gap-1" onClick={ev => ev.stopPropagation()}>
                  <Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => open(e)} />
                  <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setDeleting(e)} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={editing !== null}
        title={editing === 'new' ? 'Add employee' : 'Edit employee'}
        onClose={() => setEditing(null)}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name" className="col-span-2"><input className="field" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Employee code"><input className="field" value={form.code} onChange={e => set('code', e.target.value)} /></Field>
          <Field label="Mobile"><input className="field" value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Department">
            <select className="field" value={form.department} onChange={e => set('department', e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation"><input className="field" value={form.designation} onChange={e => set('designation', e.target.value)} /></Field>
          <Field label="Type">
            <select className="field" value={form.category} onChange={e => set('category', e.target.value as Category)}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Shift">
            <select className="field" value={form.shiftId} onChange={e => set('shiftId', Number(e.target.value))}>
              {shiftList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>)}
            </select>
          </Field>
          <Field label="Joining date"><input className="field" type="date" value={form.joinDate} onChange={e => set('joinDate', e.target.value)} /></Field>
          <Field label="Monthly salary (₹)"><input className="field" type="number" value={form.monthlySalary} onChange={e => set('monthlySalary', Number(e.target.value))} /></Field>
          <label className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Currently working
          </label>
        </div>
      </Drawer>

      <Confirm
        open={!!deleting}
        title="Delete employee?"
        message={`${deleting?.name} and their records will be removed.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) employees.remove(deleting.id); setDeleting(null); toast.ok('Employee deleted'); }}
      />
    </>
  );
};

export default Employees;

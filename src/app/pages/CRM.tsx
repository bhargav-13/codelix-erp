import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Phone, Plus, Trash2 } from 'lucide-react';
import { OWNERS, STAGES, leads, type Lead, type Stage } from '../data/crm';
import { iso } from '../data/hr';
import { Badge, Button, Card, Confirm, DataTable, Drawer, Field, PageHeader, SearchBox, Stat, Tabs, cx, fmtDate, inr, toast, type Tone } from '../ui';

const STAGE_TONE: Record<Stage, Tone> = {
  'New enquiry': 'blue', 'Quotation sent': 'amber', Negotiation: 'accent', 'Follow-up': 'gray', Won: 'green', Lost: 'red',
};

const blank = (): Omit<Lead, 'id'> => ({
  name: '', company: '', phone: '', product: '', value: 0, stage: 'New enquiry', owner: OWNERS[0], nextFollowUp: iso(new Date()), lastContact: iso(new Date()), notes: '',
});

function exportCsv(rows: Lead[]) {
  const head = ['Name', 'Company', 'Phone', 'Product', 'Value', 'Stage', 'Owner', 'Next follow-up', 'Last contact'];
  const body = rows.map(l => [l.name, l.company, l.phone, l.product, l.value, l.stage, l.owner, l.nextFollowUp || '', l.lastContact].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const url = URL.createObjectURL(new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const CRM: React.FC = () => {
  const all = leads.use();
  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('');
  const [editing, setEditing] = useState<Lead | 'new' | null>(null);
  const [form, setForm] = useState<Omit<Lead, 'id'>>(blank());
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const rows = useMemo(() => all.filter(l =>
    (!owner || l.owner === owner) && `${l.name} ${l.company} ${l.product}`.toLowerCase().includes(search.toLowerCase()),
  ), [all, owner, search]);

  const today = iso(new Date());
  const open = rows.filter(l => l.stage !== 'Won' && l.stage !== 'Lost');
  const won = rows.filter(l => l.stage === 'Won');
  const closed = rows.filter(l => l.stage === 'Won' || l.stage === 'Lost');
  const due = open.filter(l => l.nextFollowUp && l.nextFollowUp <= today).sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || ''));

  const openForm = (l: Lead | 'new') => {
    setEditing(l);
    if (l === 'new') setForm(blank());
    else { const { id: _id, ...rest } = l; setForm(rest); }
  };

  const save = () => {
    if (!form.name.trim() || !form.company.trim()) { toast.err('Name and company are required'); return; }
    if (editing === 'new') leads.create(form);
    else if (editing) leads.update(editing.id, form);
    toast.ok(editing === 'new' ? 'Lead added' : 'Lead updated');
    setEditing(null);
  };

  const move = (l: Lead, dir: -1 | 1) => {
    const i = STAGES.indexOf(l.stage) + dir;
    if (i < 0 || i >= STAGES.length) return;
    leads.update(l.id, { stage: STAGES[i], lastContact: today });
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader title="CRM" subtitle="Enquiries and deals in the pipeline."
        actions={<>
          <Button variant="outline" icon={<Download size={15} />} onClick={() => exportCsv(rows)}>Export</Button>
          <Button icon={<Plus size={16} />} onClick={() => openForm('new')}>Add lead</Button>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Open pipeline" value={inr(open.reduce((s, l) => s + l.value, 0))} hint={`${open.length} leads`} />
        <Stat label="Won" value={inr(won.reduce((s, l) => s + l.value, 0))} hint={`${won.length} deals`} />
        <Stat label="Win rate" value={closed.length ? `${Math.round((won.length / closed.length) * 100)}%` : '—'} />
        <Stat label="Follow-ups due" value={due.length} hint="today or overdue" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={view} onChange={setView} tabs={[{ id: 'board', label: 'Board' }, { id: 'list', label: 'List' }]} />
        <select className="field h-9 max-w-[170px]" value={owner} onChange={e => setOwner(e.target.value)}>
          <option value="">Everyone</option>
          {OWNERS.map(o => <option key={o}>{o}</option>)}
        </select>
        <div className="ml-auto w-full max-w-xs"><SearchBox value={search} onChange={setSearch} placeholder="Search lead, company, product" /></div>
      </div>

      <div className={cx('grid gap-4', view === 'board' && 'xl:grid-cols-[1fr_300px]')}>
        {view === 'board' ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGES.map(stage => {
              const items = rows.filter(l => l.stage === stage);
              return (
                <div key={stage} className="w-[250px] shrink-0 rounded-xl bg-muted/70 p-2">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <Badge tone={STAGE_TONE[stage]}>{stage}</Badge>
                    <span className="text-[12px] text-ink-3">{items.length} · {inr(items.reduce((s, l) => s + l.value, 0))}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(l => (
                      <div key={l.id} onClick={() => openForm(l)} className="cursor-pointer rounded-lg border border-line bg-surface p-3 hover:border-accent">
                        <div className="font-medium">{l.company}</div>
                        <div className="text-[12px] text-ink-3">{l.name} · {l.product}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-semibold">{inr(l.value)}</span>
                          <span className="flex" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" title="Previous stage" icon={<ChevronLeft size={14} />} disabled={stage === STAGES[0]} onClick={() => move(l, -1)} />
                            <Button size="sm" variant="ghost" title="Next stage" icon={<ChevronRight size={14} />} disabled={stage === STAGES[STAGES.length - 1]} onClick={() => move(l, 1)} />
                          </span>
                        </div>
                        {l.nextFollowUp && l.stage !== 'Won' && l.stage !== 'Lost' && (
                          <div className={cx('mt-1 text-[11px]', l.nextFollowUp <= today ? 'text-red-600' : 'text-ink-3')}>Follow up {fmtDate(l.nextFollowUp)}</div>
                        )}
                      </div>
                    ))}
                    {!items.length && <div className="px-2 py-4 text-center text-[12px] text-ink-3">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <DataTable
              rows={rows}
              onRowClick={openForm}
              columns={[
                { key: 'c', header: 'Company', render: l => <><div className="font-medium">{l.company}</div><div className="text-[12px] text-ink-3">{l.name}</div></> },
                { key: 'p', header: 'Product', render: l => l.product },
                { key: 'v', header: 'Value', align: 'right', render: l => inr(l.value) },
                { key: 's', header: 'Stage', render: l => <Badge tone={STAGE_TONE[l.stage]}>{l.stage}</Badge> },
                { key: 'o', header: 'Owner', render: l => l.owner },
                { key: 'f', header: 'Next follow-up', render: l => (l.nextFollowUp ? fmtDate(l.nextFollowUp) : '—') },
              ]}
            />
          </Card>
        )}

        {view === 'board' && (
          <Card title="Follow-ups due">
            <div className="px-5 pb-4">
              {due.map(l => (
                <div key={l.id} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.company}</div>
                    <div className="text-[12px] text-ink-3">{l.name} · {l.nextFollowUp === today ? 'today' : fmtDate(l.nextFollowUp)}</div>
                  </div>
                  <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="rounded-md p-1.5 text-ink-2 hover:bg-muted"><Phone size={15} /></a>
                </div>
              ))}
              {!due.length && <div className="py-6 text-center text-ink-3">All caught up</div>}
            </div>
          </Card>
        )}
      </div>

      <Drawer open={editing !== null} title={editing === 'new' ? 'Add lead' : 'Edit lead'} onClose={() => setEditing(null)}
        footer={<>
          {editing !== 'new' && editing && <Button variant="ghost" className="mr-auto" icon={<Trash2 size={15} />} onClick={() => setDeleting(editing)}>Delete</Button>}
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company" className="col-span-2"><input className="field" value={form.company} onChange={e => set('company', e.target.value)} /></Field>
          <Field label="Contact person"><input className="field" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Phone"><input className="field" value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Product interest"><input className="field" value={form.product} onChange={e => set('product', e.target.value)} /></Field>
          <Field label="Deal value (₹)"><input type="number" className="field" value={form.value || ''} onChange={e => set('value', Number(e.target.value) || 0)} /></Field>
          <Field label="Stage">
            <select className="field" value={form.stage} onChange={e => set('stage', e.target.value as Stage)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Owner">
            <select className="field" value={form.owner} onChange={e => set('owner', e.target.value)}>{OWNERS.map(o => <option key={o}>{o}</option>)}</select>
          </Field>
          <Field label="Next follow-up"><input type="date" className="field" value={form.nextFollowUp || ''} onChange={e => set('nextFollowUp', e.target.value)} /></Field>
          <Field label="Last contact"><input type="date" className="field" value={form.lastContact} onChange={e => set('lastContact', e.target.value)} /></Field>
          <Field label="Notes" className="col-span-2"><textarea className="field" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
      </Drawer>
      <Confirm open={!!deleting} title="Delete lead?" message={`${deleting?.company} will be removed.`}
        onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) leads.remove(deleting.id); setDeleting(null); setEditing(null); toast.ok('Lead deleted'); }} />
    </>
  );
};

export default CRM;

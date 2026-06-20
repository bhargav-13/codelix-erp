import React, { useState, useRef } from 'react';
import {
  Users, Flame, CheckCircle2, TrendingUp,
  Download, BarChart2, Plus, X,
  Phone, Mail, CalendarCheck,
  FileText, XCircle, Search, Upload,
} from 'lucide-react';
import './CRMPage.css';

type Stage = 'New Enquiry' | 'Quotation Sent' | 'Negotiation' | 'Follow-up' | 'Order Confirmed' | 'Lost';

interface Lead {
  id: number;
  name: string;
  company: string;
  stage: Stage;
  value: string;
  lastContact: string;
  assignedTo: string;
  phone: string;
  product: string;
}

const STAGES: Stage[] = ['New Enquiry', 'Quotation Sent', 'Negotiation', 'Follow-up', 'Order Confirmed', 'Lost'];
const ASSIGNEES = ['Anil Sharma', 'Priya Desai', 'Rahul Verma'];

const initialLeads: Lead[] = [
  { id: 1,  name: 'Rajesh Kumar',   company: 'Bharat Auto Parts Pvt. Ltd.',  stage: 'Negotiation',     value: '₹4,20,000', lastContact: '2 days ago',  assignedTo: 'Anil Sharma', phone: '+91 98201 44312', product: 'Forging Components'  },
  { id: 2,  name: 'Priya Mehta',    company: 'Shree Industries',              stage: 'Quotation Sent',  value: '₹1,85,000', lastContact: 'Today',       assignedTo: 'Priya Desai', phone: '+91 97334 21098', product: 'Casting Parts'       },
  { id: 3,  name: 'Suresh Patil',   company: 'Maharashtra Engineering Works', stage: 'New Enquiry',     value: '₹2,60,000', lastContact: '4 days ago',  assignedTo: 'Anil Sharma', phone: '+91 99880 56712', product: 'Electric Components' },
  { id: 4,  name: 'Amit Joshi',     company: 'Tata Component Supplies',       stage: 'Order Confirmed', value: '₹6,75,000', lastContact: 'Yesterday',   assignedTo: 'Rahul Verma', phone: '+91 98765 43210', product: 'Forging + Casting'   },
  { id: 5,  name: 'Neha Singh',     company: 'Precision Castings Ltd.',       stage: 'Follow-up',       value: '₹3,10,000', lastContact: '1 week ago',  assignedTo: 'Priya Desai', phone: '+91 93456 78901', product: 'Casting Components' },
  { id: 6,  name: 'Vikram Reddy',   company: 'Lakshmi Forgings',              stage: 'Quotation Sent',  value: '₹5,40,000', lastContact: '3 days ago',  assignedTo: 'Rahul Verma', phone: '+91 91234 56789', product: 'Forging Parts'       },
  { id: 7,  name: 'Manish Gupta',   company: 'Star Electricals Pvt. Ltd.',    stage: 'New Enquiry',     value: '₹1,20,000', lastContact: 'Today',       assignedTo: 'Anil Sharma', phone: '+91 87654 32109', product: 'Electric Supply'     },
  { id: 8,  name: 'Sunita Rao',     company: 'KNR Industries',                stage: 'Negotiation',     value: '₹8,90,000', lastContact: 'Yesterday',   assignedTo: 'Priya Desai', phone: '+91 96321 45678', product: 'Bulk Forging Order'  },
  { id: 9,  name: 'Dinesh Agarwal', company: 'Apex Metal Works',              stage: 'Order Confirmed', value: '₹3,30,000', lastContact: '5 days ago',  assignedTo: 'Rahul Verma', phone: '+91 94501 23456', product: 'Rejection Parts'     },
  { id: 10, name: 'Kavita Nair',    company: 'Southern Auto Components',      stage: 'Lost',            value: '₹2,00,000', lastContact: '2 weeks ago', assignedTo: 'Anil Sharma', phone: '+91 98112 34567', product: 'Casting Components' },
];

const pipelineBase = [
  { stage: 'New Enquiry',     color: '#3B82F6' },
  { stage: 'Quotation Sent',  color: '#F59E0B' },
  { stage: 'Negotiation',     color: '#8B5CF6' },
  { stage: 'Follow-up',       color: '#EC4899' },
  { stage: 'Order Confirmed', color: '#10B981' },
];

const followUps = [
  { name: 'Rajesh Kumar', company: 'Bharat Auto Parts',  time: '11:00 AM', type: 'Call',    urgent: true  },
  { name: 'Neha Singh',   company: 'Precision Castings', time: '2:30 PM',  type: 'Meeting', urgent: true  },
  { name: 'Vikram Reddy', company: 'Lakshmi Forgings',   time: '4:00 PM',  type: 'Email',   urgent: false },
  { name: 'Sunita Rao',   company: 'KNR Industries',     time: '5:00 PM',  type: 'Call',    urgent: false },
];

const activityLog = [
  { Icon: CheckCircle2, color: '#10B981', text: 'Amit Joshi confirmed order for ₹6,75,000',           time: '2h ago'    },
  { Icon: Mail,         color: '#3B82F6', text: 'Quotation sent to Vikram Reddy — Lakshmi Forgings',  time: '4h ago'    },
  { Icon: Phone,        color: '#8B5CF6', text: 'Follow-up call completed with Neha Singh',            time: 'Yesterday' },
  { Icon: FileText,     color: '#F59E0B', text: 'New enquiry added — Manish Gupta, Star Electricals', time: 'Today'     },
  { Icon: XCircle,      color: '#EF4444', text: 'Lead lost — Kavita Nair, Southern Auto Components',  time: '2d ago'    },
];

const stageBadge: Record<Stage, { bg: string; color: string }> = {
  'New Enquiry':     { bg: '#EFF6FF', color: '#1D4ED8' },
  'Quotation Sent':  { bg: '#FFFBEB', color: '#B45309' },
  'Negotiation':     { bg: '#F5F3FF', color: '#6D28D9' },
  'Follow-up':       { bg: '#FDF2F8', color: '#9D174D' },
  'Order Confirmed': { bg: '#ECFDF5', color: '#065F46' },
  'Lost':            { bg: '#FEF2F2', color: '#991B1B' },
};

const BLANK_FORM = { name: '', company: '', phone: '', product: '', stage: 'New Enquiry' as Stage, value: '', assignedTo: 'Anil Sharma' };

const FollowUpIcon: React.FC<{ type: string }> = ({ type }) => {
  const p = { size: 15, strokeWidth: 2 as const };
  if (type === 'Call')    return <Phone {...p} />;
  if (type === 'Meeting') return <CalendarCheck {...p} />;
  return <Mail {...p} />;
};

/* ─── helpers ─── */
function parseNumericValue(val: string): number {
  return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
}

function downloadCSV(leads: Lead[]) {
  const header = 'Name,Company,Phone,Product,Stage,Value,Last Contact,Assigned To';
  const rows = leads.map(l =>
    [l.name, l.company, l.phone, l.product, l.stage, l.value, l.lastContact, l.assignedTo]
      .map(v => `"${v}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'crm-leads.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): Partial<Lead>[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return {
      name:        obj['name']        || '',
      company:     obj['company']     || '',
      phone:       obj['phone']       || '',
      product:     obj['product']     || '',
      stage:       (STAGES.includes(obj['stage'] as Stage) ? obj['stage'] : 'New Enquiry') as Stage,
      value:       obj['value']       || '₹0',
      assignedTo:  obj['assigned to'] || obj['assignedto'] || 'Anil Sharma',
      lastContact: 'Today',
    };
  }).filter(r => r.name);
}

/* ═══════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════ */
const CRMPage: React.FC = () => {
  const [leads, setLeads]           = useState<Lead[]>(initialLeads);
  const [activeTab, setActiveTab]   = useState<'all' | Stage>('all');
  const [search, setSearch]         = useState('');

  /* modal states */
  const [showAddLead, setShowAddLead]       = useState(false);
  const [showImport, setShowImport]         = useState(false);
  const [showReport, setShowReport]         = useState(false);

  /* add lead form */
  const [form, setForm] = useState(BLANK_FORM);
  const [formErr, setFormErr] = useState('');

  /* import */
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview]   = useState<Partial<Lead>[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importDone, setImportDone]         = useState(false);

  /* ── derived ── */
  const filtered = leads.filter(l => {
    const matchTab    = activeTab === 'all' || l.stage === activeTab;
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const pipeline = pipelineBase.map(p => ({
    ...p,
    count: leads.filter(l => l.stage === p.stage).length,
    value: '₹' + (leads.filter(l => l.stage === p.stage).reduce((s, l) => s + parseNumericValue(l.value), 0) / 100000).toFixed(1) + 'L',
  }));

  const maxCount = Math.max(...pipeline.map(p => p.count), 1);

  /* ── add lead handlers ── */
  function handleFormChange(field: keyof typeof BLANK_FORM, val: string) {
    setForm(f => ({ ...f, [field]: val }));
    setFormErr('');
  }

  function handleAddLead() {
    if (!form.name.trim() || !form.company.trim()) {
      setFormErr('Name and Company are required.');
      return;
    }
    const newLead: Lead = {
      id:          Date.now(),
      name:        form.name.trim(),
      company:     form.company.trim(),
      phone:       form.phone.trim() || '—',
      product:     form.product.trim() || '—',
      stage:       form.stage,
      value:       form.value.trim() ? (form.value.startsWith('₹') ? form.value.trim() : '₹' + form.value.trim()) : '₹0',
      assignedTo:  form.assignedTo,
      lastContact: 'Today',
    };
    setLeads(prev => [newLead, ...prev]);
    setForm(BLANK_FORM);
    setShowAddLead(false);
  }

  /* ── import handlers ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportDone(false);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setImportPreview(parseCSV(text));
    };
    reader.readAsText(file);
  }

  function handleConfirmImport() {
    const toAdd: Lead[] = importPreview.map((r, i) => ({
      id:          Date.now() + i,
      name:        r.name        || '',
      company:     r.company     || '',
      phone:       r.phone       || '—',
      product:     r.product     || '—',
      stage:       r.stage       || 'New Enquiry',
      value:       r.value       || '₹0',
      assignedTo:  r.assignedTo  || 'Anil Sharma',
      lastContact: 'Today',
    }));
    setLeads(prev => [...toAdd, ...prev]);
    setImportDone(true);
    setImportPreview([]);
    setImportFileName('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function closeImport() {
    setShowImport(false);
    setImportPreview([]);
    setImportFileName('');
    setImportDone(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  /* ── report data ── */
  const reportByStage = STAGES.map(s => ({
    stage: s,
    count: leads.filter(l => l.stage === s).length,
    total: leads.filter(l => l.stage === s).reduce((sum, l) => sum + parseNumericValue(l.value), 0),
  }));
  const grandTotal = leads.reduce((s, l) => s + parseNumericValue(l.value), 0);

  /* ══════════════════════════════════════════
     Render
  ══════════════════════════════════════════ */
  return (
    <div className="crm-page">

      {/* ── Header ── */}
      <div className="crm-header">
        <div className="crm-header-left">
          <h1 className="crm-title">CRM & Sales</h1>
          <p className="crm-subtitle">Manage leads, track pipeline, and close deals faster</p>
        </div>
        <div className="crm-header-actions">
          <button className="crm-btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={14} strokeWidth={2} />
            Import Leads
          </button>
          <button className="crm-btn-secondary" onClick={() => setShowReport(true)}>
            <BarChart2 size={14} strokeWidth={2} />
            Report
          </button>
          <button className="crm-btn-primary" onClick={() => setShowAddLead(true)}>
            <Plus size={15} strokeWidth={2.5} />
            Add Lead
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="crm-stats">
        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
            <Users size={20} strokeWidth={1.8} />
          </div>
          <div className="crm-stat-body">
            <div className="crm-stat-value">{leads.length}</div>
            <div className="crm-stat-label">Total Leads</div>
            <div className="crm-stat-change positive">+{leads.length - initialLeads.length + 12} this month</div>
          </div>
        </div>
        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: '#FFF7ED', color: '#C2410C' }}>
            <Flame size={20} strokeWidth={1.8} />
          </div>
          <div className="crm-stat-body">
            <div className="crm-stat-value">{leads.filter(l => !['Lost', 'Order Confirmed'].includes(l.stage)).length}</div>
            <div className="crm-stat-label">Active Deals</div>
            <div className="crm-stat-change neutral">
              ₹{(leads.filter(l => !['Lost', 'Order Confirmed'].includes(l.stage)).reduce((s, l) => s + parseNumericValue(l.value), 0) / 100000).toFixed(1)}L pipeline
            </div>
          </div>
        </div>
        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: '#ECFDF5', color: '#065F46' }}>
            <CheckCircle2 size={20} strokeWidth={1.8} />
          </div>
          <div className="crm-stat-body">
            <div className="crm-stat-value">
              ₹{(leads.filter(l => l.stage === 'Order Confirmed').reduce((s, l) => s + parseNumericValue(l.value), 0) / 100000).toFixed(1)}L
            </div>
            <div className="crm-stat-label">Won This Month</div>
            <div className="crm-stat-change positive">{leads.filter(l => l.stage === 'Order Confirmed').length} deals closed</div>
          </div>
        </div>
        <div className="crm-stat-card">
          <div className="crm-stat-icon" style={{ background: '#FFFBEB', color: '#B45309' }}>
            <TrendingUp size={20} strokeWidth={1.8} />
          </div>
          <div className="crm-stat-body">
            <div className="crm-stat-value">
              {leads.length ? Math.round((leads.filter(l => l.stage === 'Order Confirmed').length / leads.length) * 100) : 0}%
            </div>
            <div className="crm-stat-label">Conversion Rate</div>
            <div className="crm-stat-change positive">+5% vs last month</div>
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="crm-main-grid">

        {/* Leads Table */}
        <div className="crm-leads-panel">
          <div className="crm-leads-header">
            <div className="crm-leads-tabs">
              {(['all', 'New Enquiry', 'Quotation Sent', 'Negotiation', 'Order Confirmed'] as const).map(t => (
                <button key={t} className={`crm-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                  {t === 'all' ? 'All Leads' : t}
                </button>
              ))}
            </div>
            <div className="crm-search-wrap">
              <Search size={13} strokeWidth={2} className="crm-search-icon" />
              <input className="crm-search" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Lead / Company</th>
                  <th>Product Interest</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Last Contact</th>
                  <th>Assigned</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id}>
                    <td>
                      <div className="crm-lead-name">{lead.name}</div>
                      <div className="crm-lead-company">{lead.company}</div>
                    </td>
                    <td className="crm-product">{lead.product}</td>
                    <td>
                      <span className="crm-stage-badge" style={{ background: stageBadge[lead.stage].bg, color: stageBadge[lead.stage].color }}>
                        {lead.stage}
                      </span>
                    </td>
                    <td className="crm-value">{lead.value}</td>
                    <td className="crm-last-contact">{lead.lastContact}</td>
                    <td>
                      <div className="crm-assignee">{lead.assignedTo.split(' ').map(w => w[0]).join('')}</div>
                    </td>
                    <td>
                      <div className="crm-row-actions">
                        <button className="crm-action-btn" title="Call"><Phone size={13} strokeWidth={2} /></button>
                        <button className="crm-action-btn" title="Email"><Mail size={13} strokeWidth={2} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="crm-empty">No leads found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="crm-right-col">

          <div className="crm-panel">
            <div className="crm-panel-title">Sales Pipeline</div>
            <div className="crm-pipeline">
              {pipeline.map((p, i) => (
                <div key={i} className="crm-pipeline-row">
                  <div className="crm-pipeline-stage">
                    <span className="crm-pipeline-dot" style={{ background: p.color }} />
                    {p.stage}
                  </div>
                  <div className="crm-pipeline-bar-wrap">
                    <div className="crm-pipeline-bar" style={{ width: `${(p.count / maxCount) * 100}%`, background: p.color }} />
                  </div>
                  <div className="crm-pipeline-meta">
                    <span className="crm-pipeline-count">{p.count}</span>
                    <span className="crm-pipeline-value">{p.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="crm-panel">
            <div className="crm-panel-title">
              Today's Follow-ups
              <span className="crm-panel-badge">{followUps.length}</span>
            </div>
            <div className="crm-followups">
              {followUps.map((f, i) => (
                <div key={i} className={`crm-followup-item ${f.urgent ? 'urgent' : ''}`}>
                  <div className="crm-followup-type-icon"><FollowUpIcon type={f.type} /></div>
                  <div className="crm-followup-info">
                    <div className="crm-followup-name">{f.name}</div>
                    <div className="crm-followup-company">{f.company}</div>
                  </div>
                  <div className="crm-followup-time">{f.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="crm-panel">
            <div className="crm-panel-title">Recent Activity</div>
            <div className="crm-activity">
              {activityLog.map(({ Icon, color, text, time }, i) => (
                <div key={i} className="crm-activity-item">
                  <span className="crm-activity-icon" style={{ color }}><Icon size={14} strokeWidth={2} /></span>
                  <div className="crm-activity-text">{text}</div>
                  <div className="crm-activity-time">{time}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════
          ADD LEAD MODAL
      ════════════════════════════════════ */}
      {showAddLead && (
        <div className="crm-modal-overlay" onClick={() => setShowAddLead(false)}>
          <div className="crm-modal" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <span className="crm-modal-title">Add New Lead</span>
              <button className="crm-modal-close" onClick={() => setShowAddLead(false)}><X size={16} /></button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-form-grid">
                <div className="crm-form-group">
                  <label className="crm-form-label">Full Name <span className="crm-required">*</span></label>
                  <input className="crm-form-input" placeholder="e.g. Rajesh Kumar" value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Company <span className="crm-required">*</span></label>
                  <input className="crm-form-input" placeholder="e.g. Bharat Auto Parts" value={form.company} onChange={e => handleFormChange('company', e.target.value)} />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Phone</label>
                  <input className="crm-form-input" placeholder="+91 98xxx xxxxx" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Product / Interest</label>
                  <input className="crm-form-input" placeholder="e.g. Forging Components" value={form.product} onChange={e => handleFormChange('product', e.target.value)} />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Deal Value</label>
                  <input className="crm-form-input" placeholder="e.g. 2,50,000" value={form.value} onChange={e => handleFormChange('value', e.target.value)} />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Stage</label>
                  <select className="crm-form-input" value={form.stage} onChange={e => handleFormChange('stage', e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="crm-form-group crm-form-group--full">
                  <label className="crm-form-label">Assigned To</label>
                  <select className="crm-form-input" value={form.assignedTo} onChange={e => handleFormChange('assignedTo', e.target.value)}>
                    {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              {formErr && <div className="crm-form-error">{formErr}</div>}
            </div>
            <div className="crm-modal-footer">
              <button className="crm-modal-cancel" onClick={() => setShowAddLead(false)}>Cancel</button>
              <button className="crm-modal-save" onClick={handleAddLead}>Add Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          IMPORT MODAL
      ════════════════════════════════════ */}
      {showImport && (
        <div className="crm-modal-overlay" onClick={closeImport}>
          <div className="crm-modal crm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <span className="crm-modal-title">Import Leads from CSV</span>
              <button className="crm-modal-close" onClick={closeImport}><X size={16} /></button>
            </div>
            <div className="crm-modal-body">
              {!importDone ? (
                <>
                  <div className="crm-import-format">
                    <p className="crm-import-hint">CSV must have these columns (header row required):</p>
                    <code className="crm-import-code">name, company, phone, product, stage, value, assigned to</code>
                  </div>

                  <div className="crm-drop-zone" onClick={() => fileRef.current?.click()}>
                    <Upload size={28} strokeWidth={1.5} color="#A5213A" />
                    <p className="crm-drop-text">
                      {importFileName ? importFileName : 'Click to select a CSV file'}
                    </p>
                    <p className="crm-drop-sub">.csv files only</p>
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
                  </div>

                  {importPreview.length > 0 && (
                    <div className="crm-import-preview">
                      <p className="crm-import-preview-label">{importPreview.length} lead(s) found — preview:</p>
                      <div className="crm-table-wrap" style={{ maxHeight: 200 }}>
                        <table className="crm-table">
                          <thead>
                            <tr><th>Name</th><th>Company</th><th>Stage</th><th>Value</th></tr>
                          </thead>
                          <tbody>
                            {importPreview.slice(0, 5).map((r, i) => (
                              <tr key={i}>
                                <td><div className="crm-lead-name">{r.name}</div></td>
                                <td className="crm-lead-company">{r.company}</td>
                                <td>
                                  <span className="crm-stage-badge" style={{ background: stageBadge[r.stage as Stage]?.bg || '#F5F5F5', color: stageBadge[r.stage as Stage]?.color || '#333' }}>
                                    {r.stage}
                                  </span>
                                </td>
                                <td className="crm-value">{r.value}</td>
                              </tr>
                            ))}
                            {importPreview.length > 5 && (
                              <tr><td colSpan={4} className="crm-empty" style={{ padding: '8px' }}>+{importPreview.length - 5} more rows</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="crm-import-success">
                  <CheckCircle2 size={40} strokeWidth={1.5} color="#10B981" />
                  <p className="crm-import-success-text">Leads imported successfully!</p>
                </div>
              )}
            </div>
            <div className="crm-modal-footer">
              <button className="crm-modal-cancel" onClick={closeImport}>
                {importDone ? 'Close' : 'Cancel'}
              </button>
              {!importDone && (
                <button
                  className="crm-modal-save"
                  onClick={handleConfirmImport}
                  disabled={importPreview.length === 0}
                >
                  Import {importPreview.length > 0 ? `${importPreview.length} Leads` : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          REPORT MODAL
      ════════════════════════════════════ */}
      {showReport && (
        <div className="crm-modal-overlay" onClick={() => setShowReport(false)}>
          <div className="crm-modal crm-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="crm-modal-header">
              <span className="crm-modal-title">Sales Report</span>
              <button className="crm-modal-close" onClick={() => setShowReport(false)}><X size={16} /></button>
            </div>
            <div className="crm-modal-body">
              <div className="crm-report-summary">
                <div className="crm-report-stat">
                  <div className="crm-report-stat-val">{leads.length}</div>
                  <div className="crm-report-stat-label">Total Leads</div>
                </div>
                <div className="crm-report-stat">
                  <div className="crm-report-stat-val">₹{(grandTotal / 100000).toFixed(1)}L</div>
                  <div className="crm-report-stat-label">Total Pipeline</div>
                </div>
                <div className="crm-report-stat">
                  <div className="crm-report-stat-val">{leads.filter(l => l.stage === 'Order Confirmed').length}</div>
                  <div className="crm-report-stat-label">Deals Won</div>
                </div>
                <div className="crm-report-stat">
                  <div className="crm-report-stat-val">{leads.filter(l => l.stage === 'Lost').length}</div>
                  <div className="crm-report-stat-label">Deals Lost</div>
                </div>
              </div>

              <table className="crm-table crm-report-table">
                <thead>
                  <tr><th>Stage</th><th>Leads</th><th>Total Value</th><th>Avg. Value</th></tr>
                </thead>
                <tbody>
                  {reportByStage.map(r => (
                    <tr key={r.stage}>
                      <td>
                        <span className="crm-stage-badge" style={{ background: stageBadge[r.stage].bg, color: stageBadge[r.stage].color }}>
                          {r.stage}
                        </span>
                      </td>
                      <td className="crm-value">{r.count}</td>
                      <td className="crm-value">₹{r.total.toLocaleString('en-IN')}</td>
                      <td className="crm-last-contact">{r.count ? '₹' + Math.round(r.total / r.count).toLocaleString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                  <tr className="crm-report-total-row">
                    <td><strong>Total</strong></td>
                    <td className="crm-value"><strong>{leads.length}</strong></td>
                    <td className="crm-value"><strong>₹{grandTotal.toLocaleString('en-IN')}</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="crm-modal-footer">
              <button className="crm-modal-cancel" onClick={() => setShowReport(false)}>Close</button>
              <button className="crm-modal-save" onClick={() => downloadCSV(leads)}>
                <Download size={14} strokeWidth={2} />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CRMPage;

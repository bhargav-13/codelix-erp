import React, { useState } from 'react';
import { Database, ImagePlus, RotateCcw } from 'lucide-react';
import { resetDemoData } from '../data/demoStore';
import { NAV } from '../nav';
import { ACCENTS, useSettings, type CompanySettings } from '../settings';
import { Badge, Button, Card, Field, PageHeader, cx, toast } from '../ui';

const Settings: React.FC = () => {
  const { settings, update } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);

  const onLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 300_000) { toast.err('Logo must be under 300 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => update({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Company profile, appearance and data." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Company" className="pb-5">
          <div className="space-y-4 px-5 pt-2">
            <Field label="Company name">
              <input className="field" value={settings.companyName} onChange={e => update({ companyName: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <input className="field" value={settings.tagline} onChange={e => update({ tagline: e.target.value })} />
            </Field>
            <Field label="Industry">
              <select
                className="field"
                value={settings.industry}
                onChange={e => update({ industry: e.target.value as CompanySettings['industry'] })}
              >
                <option value="manufacturing">General manufacturing</option>
                <option value="forging">Forging & casting</option>
                <option value="plating">Plating & finishing</option>
              </select>
            </Field>
            <Field label="Logo">
              <div className="flex items-center gap-3">
                {settings.logoDataUrl
                  ? <img src={settings.logoDataUrl} alt="" className="h-12 w-12 rounded-lg border border-line object-contain" />
                  : <span className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-line text-ink-3"><ImagePlus size={18} /></span>}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => onLogo(e.target.files?.[0])} />
                  <span className="inline-flex h-8 items-center rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-muted">Upload</span>
                </label>
                {settings.logoDataUrl && <Button size="sm" variant="ghost" onClick={() => update({ logoDataUrl: undefined })}>Remove</Button>}
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Appearance" className="pb-5">
          <div className="space-y-5 px-5 pt-2">
            <Field label="Brand colour">
              <div className="flex flex-wrap items-center gap-2">
                {ACCENTS.map(c => (
                  <button
                    key={c}
                    onClick={() => update({ accent: c })}
                    style={{ background: c }}
                    className={cx('h-8 w-8 rounded-full ring-offset-2 ring-offset-surface', settings.accent === c && 'ring-2 ring-ink')}
                  />
                ))}
                <input type="color" value={settings.accent} onChange={e => update({ accent: e.target.value })} className="h-8 w-10 cursor-pointer rounded" />
              </div>
            </Field>
            <Field label="Theme">
              <div className="flex gap-2">
                <Button variant={settings.dark ? 'outline' : 'primary'} size="sm" onClick={() => update({ dark: false })}>Light</Button>
                <Button variant={settings.dark ? 'primary' : 'outline'} size="sm" onClick={() => update({ dark: true })}>Dark</Button>
              </div>
            </Field>
          </div>
        </Card>

        <Card
          title={<span className="flex items-center gap-2"><Database size={16} /> Data sources</span>}
          className="xl:col-span-2"
          action={
            confirmReset ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
                <Button size="sm" variant="danger" onClick={() => { resetDemoData(); setConfirmReset(false); toast.ok('Sample data restored'); }}>
                  Yes, reset
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" icon={<RotateCcw size={14} />} onClick={() => setConfirmReset(true)}>Reset sample data</Button>
            )
          }
        >
          <p className="px-5 text-ink-2">
            <b>Live</b> modules read and write the company server. <b>Sample</b> modules keep their data in this browser only;
            resetting restores their starting data and never touches live records.
          </p>
          <div className="grid gap-x-8 gap-y-1 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {NAV.flatMap(g => g.items).filter(i => i.path !== '/settings').map(i => (
              <div key={i.path} className="flex items-center justify-between border-b border-line py-2">
                <span className="flex items-center gap-2"><i.icon size={15} className="text-ink-3" /> {i.label}</span>
                <Badge tone={i.source === 'live' ? 'green' : 'blue'}>{i.source === 'live' ? 'Live' : 'Sample'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

export default Settings;

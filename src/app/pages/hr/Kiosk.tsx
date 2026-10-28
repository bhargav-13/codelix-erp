import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, ScanFace } from 'lucide-react';
import { attendance, employees, iso, punch, type Employee } from '../../data/hr';
import { Badge, Button, Card, PageHeader, SearchBox, cx } from '../../ui';

/**
 * Simulated face-attendance terminal. In the real HRMS punches come from a
 * ZKTeco device; here the presenter taps a person (optionally with the laptop
 * camera running for effect) and the punch lands in Attendance instantly.
 */
const Kiosk: React.FC = () => {
  const emps = employees.use().filter(e => e.active);
  const att = attendance.use();
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState<Employee | null>(null);
  const [result, setResult] = useState<{ e: Employee; kind: 'IN' | 'OUT' | 'DONE'; at: string } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);

  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 0);
    } catch {
      setCameraOn(false);
    }
  };

  const recognise = (e: Employee) => {
    if (scanning) return;
    setResult(null);
    setScanning(e);
    setTimeout(() => {
      const at = new Date();
      const kind = punch(e.id, at);
      setScanning(null);
      setResult({ e, kind, at: at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
    }, 1300);
  };

  const today = iso(new Date());
  const todays = att.filter(a => a.date === today && a.inTime);
  const list = emps.filter(e => `${e.name} ${e.code}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Face kiosk" subtitle="Tap a person to simulate a face punch. First punch is IN, second is OUT." />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <div className="relative grid aspect-video place-items-center bg-gray-950 text-white">
            {cameraOn ? <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full -scale-x-100 object-cover" /> : null}
            <div className={cx('relative z-10 grid h-48 w-48 place-items-center rounded-[2rem] border-2', scanning ? 'border-emerald-400' : 'border-white/30')}>
              {scanning && <div className="absolute inset-x-3 top-3 h-0.5 animate-[scan_1.3s_ease-in-out_infinite] bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.7)]" />}
              {!cameraOn && !scanning && !result && <ScanFace size={64} className="opacity-40" />}
            </div>
            <div className="absolute left-4 top-4 z-10 text-left">
              <div className="text-[28px] font-semibold tabular-nums">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
              <div className="text-[13px] opacity-70">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </div>
            <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-5 text-center">
              {scanning ? (
                <div className="text-[16px]">Recognising…</div>
              ) : result ? (
                <div className="flex items-center justify-center gap-2 text-[17px]">
                  <CheckCircle2 className="text-emerald-400" />
                  <span>
                    {result.kind === 'DONE'
                      ? <>{result.e.name} has already punched out today</>
                      : <><b>{result.e.name}</b> · Punch {result.kind} at {result.at}</>}
                  </span>
                </div>
              ) : (
                <div className="opacity-70">Look at the camera</div>
              )}
            </div>
            <button onClick={toggleCamera} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20" title="Camera">
              {cameraOn ? <CameraOff size={18} /> : <Camera size={18} />}
            </button>
          </div>
          <div className="border-t border-line p-4">
            <SearchBox value={search} onChange={setSearch} placeholder="Find person" />
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {list.map(e => {
                const rec = todays.find(a => a.employeeId === e.id);
                return (
                  <button
                    key={e.id}
                    onClick={() => recognise(e)}
                    className="flex items-center gap-2 rounded-lg border border-line p-2 text-left hover:border-accent hover:bg-accent-soft"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                      {e.name.split(' ').map(s => s[0]).join('')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{e.name}</span>
                      <span className="block text-[11px] text-ink-3">{rec ? (rec.outTime ? `Out ${rec.outTime}` : `In ${rec.inTime}`) : e.code}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card title={`Today's punches · ${todays.length}`}>
          <div className="max-h-[640px] overflow-y-auto px-5 pb-4">
            {[...todays].sort((a, b) => (b.outTime || b.inTime || '').localeCompare(a.outTime || a.inTime || '')).map(a => {
              const e = emps.find(x => x.id === a.employeeId);
              return (
                <div key={a.id} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                  <div>
                    <div className="font-medium">{e?.name}</div>
                    <div className="text-[12px] text-ink-3">In {a.inTime}{a.outTime ? ` · Out ${a.outTime}` : ''}</div>
                  </div>
                  <Badge tone={a.status === 'LATE' ? 'amber' : 'green'}>{a.status === 'LATE' ? 'Late' : 'On time'}</Badge>
                </div>
              );
            })}
            {!todays.length && <div className="py-10 text-center text-ink-3">No punches yet today</div>}
            {todays.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => todays.forEach(a => attendance.remove(a.id))}>
                Clear today's punches
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};

export default Kiosk;

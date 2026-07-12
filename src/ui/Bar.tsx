import { Tip } from './Tip';

export function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const cls = v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
  return (
    <div className="bar-row">
      <span className="bar-label">{hint ? <Tip text={hint}>{label}</Tip> : label}</span>
      <div className="bar-track">
        <div className={`bar-fill ${cls}`} style={{ width: `${v}%` }} />
      </div>
      <span className="bar-value">{Math.round(v)}</span>
    </div>
  );
}

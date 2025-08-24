import type { BusEvent } from '@emmett08/scorecards-framework';
import { useApi } from '@backstage/frontend-plugin-api';
import { scorecardsApiRef } from '../api';
import { useState, useEffect } from 'react';

function fmt(ts: string) { try { return new Date(ts).toLocaleString(); } catch { return ts; } }

export const EventStreamPanel: React.FC<{ entityRef: string }> = ({ entityRef }) => {
  const api = useApi(scorecardsApiRef);
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [since, setSince] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const list = await api.listEvents(entityRef, since);
        if (cancelled) return;
        if (list.length) {
          setEvents(prev => {
            const merged = [...prev, ...list];
            // Keep last 200
            return merged.slice(-200);
          });
          const lastTs = list[list.length - 1]?.timestamp;
          if (lastTs) setSince(lastTs);
        }
        setError(undefined);
      } catch (e: any) {
        setError(String(e));
      }
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [entityRef, since, api]);

  return (
    <div>
      <h4 style={{ margin: '8px 0' }}>Recent Events</h4>
      {error && <div style={{ color: '#b00020' }}>Events unavailable: {error}</div>}
      {!events.length && !error && <div>No recent events.</div>}
      <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8, width: 180 }}>Time</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8, width: 220 }}>Type</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Payload</th>
            </tr>
          </thead>
          <tbody>
            {events.slice().reverse().map((e, idx) => (
              <tr key={`${e.id ?? idx}-${e.timestamp}`}>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{fmt(e.timestamp)}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{e.type}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee', fontFamily: 'monospace', fontSize: 12 }}>
                  {JSON.stringify(e.payload)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

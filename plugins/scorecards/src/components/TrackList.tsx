import type { TrackRecord } from '@emmett08/scorecards-framework';

export const TrackList: React.FC<{ tracks: TrackRecord[] }> = ({ tracks }) => {
  if (!tracks.length) return <div>No open tracks.</div>;
  return (
    <div>
      <h4 style={{ margin: '8px 0' }}>Open Tracks</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Check</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Opened</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Due</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map(t => (
            <tr key={t.id}>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{t.name}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{new Date(t.openedAt).toLocaleString()}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{t.closedAt ? new Date(t.closedAt).toLocaleString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

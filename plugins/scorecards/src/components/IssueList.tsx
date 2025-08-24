import type { Issue } from '@emmett08/scorecards-framework';

export const IssueList: React.FC<{ issues: Issue[] }> = ({ issues }) => {
  if (!issues.length) return <div>No open issues.</div>;
  return (
    <div>
      <h4 style={{ margin: '8px 0' }}>Open Issues</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Key</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Title</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Opened</th>
          </tr>
        </thead>
        <tbody>
          {issues.map(i => (
            <tr key={i.id}>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{i.key}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{i.title}</td>
              <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{new Date(i.openedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import type { CheckResult } from '@emmett08/scorecards-framework';

export const ChecksTable: React.FC<{ results: CheckResult[] }> = ({ results }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Result</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Check</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Severity</th>
          <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 8 }}>Summary</th>
        </tr>
      </thead>
      <tbody>
        {results.map(r => (
          <tr key={r.checkId}>
            <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
              <span style={{ color: r.passed ? '#1b873f' : '#b00020', fontWeight: 600 }}>
                {r.passed ? 'PASS' : 'FAIL'}
              </span>
            </td>
            <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{r.name}</td>
            <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{r.severity}</td>
            <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{r.summary}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

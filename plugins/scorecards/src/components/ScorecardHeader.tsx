import { RagPill } from './common/RagPill';
// import type { Evaluation } from '@emmett08/scorecards-framework';

export const ScorecardHeader: React.FC<{ data: any; title?: string }> = ({ data, title = 'Scorecards' }) => {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <RagPill rag={data.rag} />
      <div style={{ fontWeight: 500 }}>{Math.round(data.score * 100)}%</div>
    </div>
  );
};

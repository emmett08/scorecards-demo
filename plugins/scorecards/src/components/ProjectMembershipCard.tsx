import type { Project } from '@emmett08/scorecards-framework';

export const ProjectMembershipCard: React.FC<{ projects: Project[]; entityRef: string }> = ({ projects, entityRef }) => {
  const mine = projects.filter(p => p.members.has(entityRef));
  if (!mine.length) return <div>Not enrolled in any project.</div>;
  return (
    <div>
      <h4 style={{ margin: '8px 0' }}>Projects</h4>
      <ul style={{ paddingLeft: 16, margin: 0 }}>
        {mine.map(p => (
          <li key={p.id}><strong>{p.name}</strong> — {p.goal} <span style={{ opacity: 0.6 }}>({p.id})</span></li>
        ))}
      </ul>
    </div>
  );
};

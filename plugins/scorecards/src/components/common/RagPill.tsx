import React from 'react';

type Rag = 'green' | 'amber' | 'red';

const RAG_COLOURS: Record<Rag, string> = {
  green: '#1b873f',
  amber: '#b68900',
  red: '#b00020',
};

export const RagPill: React.FC<{ rag: Rag }> = ({ rag }) => {
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: RAG_COLOURS[rag],
        color: '#fff',
        fontSize: 12,
      }}
    >
      {rag.toUpperCase()}
    </span>
  );
};

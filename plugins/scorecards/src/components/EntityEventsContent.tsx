import { useMemo } from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { EventStreamPanel } from './EventStreamPanel';

const toEntityRef = (kind: string, ns: string | undefined, name: string) =>
  `${kind.toLowerCase()}:${(ns || 'default').toLowerCase()}/${name.toLowerCase()}`;

export const EntityEventsContent: React.FC = () => {
  const { entity } = useEntity();
  const entityRef = useMemo(
    () => toEntityRef(entity.kind, entity.metadata.namespace, entity.metadata.name),
    [entity],
  );
  return <EventStreamPanel entityRef={entityRef} />;
};

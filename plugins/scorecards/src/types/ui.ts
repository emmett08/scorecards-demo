export type ScoreStatus = 'pass' | 'warn' | 'fail' | 'stale' | 'unknown';
export type Band = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Evidence {
  label: string;
  url?: string;
}

export interface Waiver {
  active: boolean;
  reason?: string;
  expiresAt?: string;
}

export interface UICheck {
  id: string;
  title: string;
  status: ScoreStatus;
  value?: number | string;
  target?: number | string;
  trend?: number[];
  evidence?: Evidence[];
  owner?: string;
  updatedAt: string; // ISO
  waiver?: Waiver;
}

export interface ChecksTableRow {
  id: string;
  title: string;              // UI label
  status: ScoreStatus;        // derived from passed+severity+staleness
  value?: number | string;
  target?: number | string;
  evidence?: Evidence[];
  owner?: string;
  updatedAt: string;          // ISO date
  waiver?: Waiver;
  trend?: number[];
}

import type { Severity, CheckResult as FrameworkCheckResult } from '@emmett08/scorecards-framework';
import type { ChecksTableRow, ScoreStatus, Evidence, Waiver } from '../types/ui';

type IncomingCheck =
  Omit<FrameworkCheckResult, 'summary' | 'evaluatedAt'> & {
    summary?: string;
    evaluatedAt?: string;
    status?: ScoreStatus;
    trend?: number[];
    updatedAt?: string;
  };

export interface StatusRules {
  staleAfterMs?: number;
  severityToStatus?: (sev: Severity) => Extract<ScoreStatus, 'warn' | 'fail'>;
}

const defaultRules: StatusRules = {
  staleAfterMs: 7 * 24 * 60 * 60 * 1000,
  severityToStatus: () => 'fail',
};

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function deriveStatus(r: IncomingCheck, rules: StatusRules = defaultRules): ScoreStatus {
  if (r.status) return r.status;
  if (rules.staleAfterMs && r.evaluatedAt) {
    const age = Date.now() - new Date(r.evaluatedAt).getTime();
    if (age > rules.staleAfterMs) return 'stale';
  }
  if (r.passed) return 'pass';
  return (rules.severityToStatus ?? defaultRules.severityToStatus!)(r.severity);
}

function normaliseEvidence(e: IncomingCheck['evidence']): Evidence[] | undefined {
  if (!Array.isArray(e) || e.length === 0) return undefined;
  const items: Evidence[] = e.map((raw, i) => {
    if (typeof raw === 'string') return { label: raw };
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, any>;
      const k = obj.key ?? obj.label ?? obj.name ?? `Evidence ${i + 1}`;
      const v = obj.value;
      const unit = obj.unit ? ` ${obj.unit}` : '';
      const label = v !== undefined ? `${k}: ${String(v)}${unit}` : String(k);
      return { label };
    }
    return { label: `Evidence ${i + 1}` };
  });
  return items.length ? items : undefined;
}

function deriveValueForBadge(r: IncomingCheck): number | undefined {
  if (Array.isArray(r.trend) && r.trend.length > 0) {
    const last = r.trend[r.trend.length - 1];
    return isFiniteNumber(last) ? last : undefined;
  }
  const first = Array.isArray(r.evidence) ? (r.evidence[0] as any) : undefined;
  if (first && isFiniteNumber(first?.value)) {
    if (first.unit === 'percentage') return (first.value / 100) * 5;
    if (first.unit === 'fraction') return first.value * 5;
  }
  return undefined;
}

export function mapApiResultToRow(
  r: IncomingCheck,
  opts?: { owner?: string; waiver?: Waiver; target?: number | string; statusRules?: StatusRules },
): ChecksTableRow {
  return {
    id: r.checkId,
    title: r.name,
    status: deriveStatus(r, opts?.statusRules),
    value: deriveValueForBadge(r),
    target: opts?.target,
    evidence: normaliseEvidence(r.evidence),
    owner: opts?.owner,
    updatedAt: r.updatedAt ?? r.evaluatedAt ?? new Date(0).toISOString(), // safe fallback
    waiver: opts?.waiver,
    trend: r.trend,
  };
}

/** Accept an array of either strict framework results or loose API items */
export function mapEvaluateResponseToRows(
  results: ReadonlyArray<FrameworkCheckResult | IncomingCheck>,
  opts?: { owner?: string; waiver?: Waiver; target?: number | string; statusRules?: StatusRules },
): ChecksTableRow[] {
  return results.map(r => mapApiResultToRow(r as IncomingCheck, opts));
}

/** Optional single-item alias */
export function mapResultToRow(
  r: FrameworkCheckResult | IncomingCheck,
  opts?: { owner?: string; waiver?: Waiver; target?: number | string; statusRules?: StatusRules },
): ChecksTableRow {
  return mapApiResultToRow(r as IncomingCheck, opts);
}

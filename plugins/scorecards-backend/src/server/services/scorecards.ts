import {
  StoreBackedFactProvider,
  JsonRuleCheck,
  OpaCheck,
  ScorecardService,
} from '@emmett08/scorecards-framework';
import { opa } from './clients';
import type { EventBus } from '@emmett08/scorecards-framework/events';

export function createScorecardService(
  facts: StoreBackedFactProvider,
  bus: EventBus,
): ScorecardService {
  const sloCheck = new JsonRuleCheck(
    'slo-budget',
    'Error budget remaining >= 20% (30d)',
    'high',
    facts,
    { all: [{ fact: 'datadog.slo.errorBudgetRemaining', operator: 'greaterThanInclusive', value: 0.2 }] },
  );

  const changeApprovalCheck = new JsonRuleCheck(
    'change-approval',
    'Change approvals >= 95% (30d)',
    'medium',
    facts,
    { all: [{ fact: 'servicenow.change.approvedPct', operator: 'greaterThanInclusive', value: 95 }] },
  );

  const incidentMttrCheck = new JsonRuleCheck(
    'incident-mttr',
    'Incident MTTR <= 4h (30d)',
    'medium',
    facts,
    { all: [{ fact: 'servicenow.incident.mttrHours', operator: 'lessThanInclusive', value: 4 }] },
  );

  const supportReopenCheck = new JsonRuleCheck(
    'support-reopen',
    'Support reopen rate <= 5% (30d)',
    'low',
    facts,
    { all: [{ fact: 'support.reopenRatePct', operator: 'lessThanInclusive', value: 5 }] },
  );

  const opaCheck = new OpaCheck(
    'opa-production-readiness',
    'OPA: Production readiness policy',
    'high',
    opa,
    'policies/production_readiness',
    async () => ({ deny: false } as any),
  );

  return new ScorecardService(
    [
      {
        id: 'compliance',
        name: 'Compliance Scorecard',
        checks: [
          { check: sloCheck, weight: 2 },
          { check: changeApprovalCheck, weight: 2 },
          { check: incidentMttrCheck, weight: 1 },
          { check: supportReopenCheck, weight: 1 },
          { check: opaCheck, weight: 2 },
        ],
        passingThreshold: 0.8,
      },
    ],
    undefined,
    bus,
  );
}

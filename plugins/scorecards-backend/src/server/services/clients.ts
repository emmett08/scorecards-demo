import {
  MockDatadogClient,
  MockServiceNowClient,
  MockSupportClient,
  MockOpaClient,
} from '@emmett08/scorecards-framework';

export const dd = new MockDatadogClient();
export const snow = new MockServiceNowClient();
export const sup = new MockSupportClient();
export const opa = new MockOpaClient();

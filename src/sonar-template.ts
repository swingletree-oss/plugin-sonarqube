import { CheckRunSummaryTemplate } from "./template/model/summary-template";
import { SonarWebhookData } from "./client/sonar-wehook-event";

export interface SonarCheckRunSummaryTemplate extends CheckRunSummaryTemplate {
  event: SonarWebhookData;

  /** sonar coverage measure value of target branch */
  targetCoverage?: number;

  /** sonar coverage measure of analyzed branch */
  branchCoverage?: number;

  /** were annotations capped to a specific amount? */
  annotationsCapped?: boolean;

  /** original issue count, in the case of annotation capping */
  issueCounts?: Map<string, number>;

  totalIssues?: number;
}
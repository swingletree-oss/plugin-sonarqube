import { Harness } from "@swingletree-oss/harness";
import { SonarWebhookData } from "./client/sonar-wehook-event";

export enum SonarEvents {
  SonarAnalysisComplete = "sonar:analysis-complete"
}


export class SonarAnalysis {
  analysisEvent: SonarWebhookData;
  targetBranch?: string;

  constructor(analysisEvent: SonarWebhookData) {
    this.analysisEvent = analysisEvent;
  }
}
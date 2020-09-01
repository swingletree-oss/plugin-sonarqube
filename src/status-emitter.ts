import { injectable, inject } from "inversify";
import { ConfigurationService, SonarConfig } from "./configuration";
import { SonarWebhookData, QualityGateStatus } from "./client/sonar-wehook-event";
import SonarClient from "./client/sonar-client";
import { Sonar } from "./client/sonar-issue";
import { SonarCheckRunSummaryTemplate } from "./sonar-template";
import { TemplateEngine, Templates } from "./template/template-engine";
import { Harness, log } from "@swingletree-oss/harness";
import ScottyClient from "@swingletree-oss/scotty-client";
import { SonarAnalysis } from "./events";

@injectable()
class SonarStatusEmitter {
  private readonly sonarClient: SonarClient;
  private readonly templateEngine: TemplateEngine;

  private readonly severityMap: any = {
    "BLOCKER": Harness.Severity.BLOCKER,
    "CRITICAL": Harness.Severity.BLOCKER,
    "MAJOR": Harness.Severity.MAJOR,
    "MINOR": Harness.Severity.WARNING,
    "INFO": Harness.Severity.INFO
  };

  private readonly context: string;
  private readonly client: ScottyClient;

  constructor(
    @inject(ConfigurationService) configurationService: ConfigurationService,
    @inject(SonarClient) sonarClient: SonarClient,
    @inject(TemplateEngine) templateEngine: TemplateEngine
  ) {
    this.sonarClient = sonarClient;
    this.templateEngine = templateEngine;
    this.context = configurationService.get(SonarConfig.CONTEXT);

    this.client = new ScottyClient(configurationService.get(SonarConfig.SCOTTY_URL));
  }

  private dashboardUrl(sonarEvent: SonarWebhookData): string {
    if (sonarEvent.branch) {
      return sonarEvent.branch.url;
    } else {
      return (sonarEvent.project) ? sonarEvent.project.url : sonarEvent.serverUrl;
    }
  }

  private async processCoverageDeltas(summaryTemplateData: SonarCheckRunSummaryTemplate, event: SonarAnalysis) {
    try {
      const projectKey = event.analysisEvent.project.key;
      const currentBranch = event.analysisEvent.branch.name;
      const targetBranch = event.targetBranch;

      let deltaCoverage: number = null;
      let branchCoverage: number = null;

      if (!targetBranch && event.analysisEvent.branch.isMain) { // main branch analysis and no target branch set in sonar analysis parameters
        const historyDelta = await this.sonarClient.getMeasureHistoryDelta(projectKey, Sonar.model.Metrics.COVERAGE);
        deltaCoverage = historyDelta.delta;
        branchCoverage = historyDelta.coverage;
      } else { // non-main branch analysis
        branchCoverage = await this.sonarClient.getMeasureValueAsNumber(projectKey, Sonar.model.Metrics.COVERAGE, currentBranch);
        const mainCoverage = await this.sonarClient.getMeasureValueAsNumber(projectKey, Sonar.model.Metrics.COVERAGE, targetBranch);
        deltaCoverage = branchCoverage - mainCoverage;

        summaryTemplateData.targetCoverage = mainCoverage;
      }

      summaryTemplateData.branchCoverage = branchCoverage;

      if (Number.isNaN(branchCoverage) || Number.isNaN(deltaCoverage)) {
        return null;
      }

      return `Coverage: ${branchCoverage.toFixed(1)} (${(deltaCoverage < 0 ? "" : "+")}${deltaCoverage.toFixed(1)}%)`;
    } catch (err) {
      log.warn("failed to calculate coverage delta: ", err);
    }
  }

  private getIssueProjectPath(issue: Sonar.model.Issue, issueSummary: Sonar.util.IssueSummary): string {
    let result = "";

    if (issue.subProject) {
      const subProject = issueSummary.components.get(issue.subProject);
      if (subProject && subProject.path) {
        result = `${subProject.path}/`;
      } else {
        log.debug("failed to retrieve sonar component path for subproject %s", issue.subProject);
        return undefined;
      }
    }

    const component = issueSummary.components.get(issue.component);
    if (component && component.path) {
      result = `${result}${component.path}`;
    } else {
      log.debug("failed to retrieve sonar component path for %s", issue.component);
      return undefined;
    }

    return result;
  }

  private processIssues(annotations: Harness.Annotation[], summaryTemplateData: SonarCheckRunSummaryTemplate, issueSummary: Sonar.util.IssueSummary, counters: Map<string, number>) {
    issueSummary.issues.forEach((item) => {

      const annotation: Harness.FileAnnotation = new Harness.FileAnnotation();
      Object.assign(annotation, {
        path: this.getIssueProjectPath(item, issueSummary),
        start: item.line,
        end: item.line,
        title: `${item.severity} ${item.type} (${item.rule})`,
        detail: item.message,
        severity: this.severityMap[item.severity] || Harness.Severity.INFO,
        metadata: {
          hash: item.hash
        } as Object
      } as Harness.FileAnnotation);

      // update counters
      if (counters.has(item.type)) {
        counters.set(item.type, counters.get(item.type) + 1);
      } else {
        counters.set(item.type, 1);
      }

      // set text range, if available
      if (item.textRange) {
        annotation.start = item.textRange.startLine;
        annotation.end = item.textRange.endLine;
      }

      if (annotation.path) {
        annotations.push(annotation);
      } else {
        log.debug("skipped an annotation due to missing path.");
      }
    });

    summaryTemplateData.issueCounts = counters;

  }

  private evaluateTitle(conclusion: Harness.Conclusion, nonFailureTitle: string) {
    if (conclusion == Harness.Conclusion.ANALYSIS_FAILURE) {
      return "SonarQube task failure";
    }

    if (conclusion == Harness.Conclusion.UNDECISIVE) {
      return "missing quality gate data";
    }

    return nonFailureTitle;
  }

  private evaluateCheckStatus(sonarEvent: SonarWebhookData): Harness.Conclusion {
    if (sonarEvent.status?.toLowerCase() != "success") {
      log.info("analysis failure for sonarqube task %s", sonarEvent.taskId);
      return Harness.Conclusion.ANALYSIS_FAILURE;
    }

    const isQualityGatePresent = sonarEvent.qualityGate;
    if (isQualityGatePresent) {
      return sonarEvent.qualityGate.status == QualityGateStatus.OK ? Harness.Conclusion.PASSED : Harness.Conclusion.BLOCKED;
    } else {
      return Harness.Conclusion.UNDECISIVE;
    }
  }

  public async sendReport(event: SonarAnalysis, source: Harness.ScmSource, uid: string) {
    const summaryTemplateData: SonarCheckRunSummaryTemplate = { event: event.analysisEvent };

    (source as Harness.GithubSource).branch = event.analysisEvent.branch ? [ event.analysisEvent.branch.name ] : null ;

    const checkStatus = this.evaluateCheckStatus(event.analysisEvent);

    const notificationData: Harness.AnalysisReport = {
      sender: this.context,
      link: this.dashboardUrl(event.analysisEvent),
      source: source,
      uuid: uid,
      checkStatus: checkStatus,
      title: this.evaluateTitle(checkStatus, event.analysisEvent.qualityGate?.status)
    };


    // calculate coverage deltas
    const titleCoverage = await this.processCoverageDeltas(summaryTemplateData, event);
    if (titleCoverage) {
      notificationData.title += ` - ${titleCoverage}`;
    }

    try {
      const issueSummary = await this.sonarClient.getIssues(event.analysisEvent.project.key, event.analysisEvent.branch.name);
      const counters: Map<string, number> = new Map<string, number>();

      // preset known rule types
      for (const rule in Sonar.model.RuleType) {
        counters.set(rule, 0);
      }

      if (issueSummary.issues.length > 0) {
        notificationData.annotations = [];

        this.processIssues(notificationData.annotations, summaryTemplateData, issueSummary, counters);

        if (notificationData.annotations.length >= 50) {
          // this is a GitHub api constraint. Annotations are limited to 50 items max.
          summaryTemplateData.annotationsCapped = true;
          summaryTemplateData.totalIssues = issueSummary.issues.length;
        }
      }
    } catch (err) {
      log.warn("failed to retrieve SonarQube issues for check annotations. This affects %s : %s", source.toRefString(), err);
    }

    // add summary via template engine
    notificationData.markdown = this.templateEngine.template<SonarCheckRunSummaryTemplate>(Templates.CHECK_RUN_SUMMARY, summaryTemplateData);

    log.debug("sending report to scotty:\n%j", notificationData);

    try {
      await this.client.sendReport(notificationData);
    } catch (error) {
      log.error("could not send payload to scotty.\n%j", error);
    }

    return notificationData;
  }
}

export default SonarStatusEmitter;
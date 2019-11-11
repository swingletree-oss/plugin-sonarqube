"use strict";

import { Request, Response, Router } from "express";
import { inject, injectable } from "inversify";
import { ConfigurationService, SonarConfig } from "./configuration";
import { SonarWebhookData } from "./client/sonar-wehook-event";
import { SonarAnalysis } from "./events";
import { log, Comms, Harness } from "@swingletree-oss/harness";
import { BadRequestError } from "@swingletree-oss/harness/dist/comms";
import SonarStatusEmitter from "./status-emitter";

/** Provides a Webhook for Sonar
 */
@injectable()
class SonarWebhook {
  public static readonly IGNORE_ID = "sonar";

  private readonly configurationService: ConfigurationService;
  private readonly statusEmitter: SonarStatusEmitter;

  constructor(
    @inject(ConfigurationService) configurationService: ConfigurationService,
    @inject(SonarStatusEmitter) statusEmitter: SonarStatusEmitter
  ) {
    this.configurationService = configurationService;
    this.statusEmitter = statusEmitter;
  }

  private isWebhookEventRelevant(event: SonarWebhookData) {
    if (event.properties !== undefined) {
      return event.properties["sonar.analysis.commitId"] !== undefined &&
        event.properties["sonar.analysis.repository"] !== undefined;
    }

    return false;
  }

  public getRouter(): Router {
    const router = Router();
    router.post("/", this.webhook.bind(this));
    return router;
  }

  public webhook = async (req: Request, res: Response) => {
    log.debug("received SonarQube webhook event");

    if (this.configurationService.getBoolean(SonarConfig.LOG_WEBHOOK_EVENTS)) {
      log.debug(JSON.stringify(req.body));
    }

    const message: Comms.Gate.PluginReportProcessRequest<SonarWebhookData> = req.body;
    const webhookData: SonarWebhookData = message.data.report;

    if (this.isWebhookEventRelevant(webhookData)) {
      const coordinates = webhookData.properties["sonar.analysis.repository"].split("/");

      const source = new Harness.GithubSource();
      source.owner = coordinates[0];
      source.repo = coordinates[1];
      source.sha = webhookData.properties["sonar.analysis.commitId"];
      source.branch = [ webhookData.properties["sonar.branch.target"] ];

      const analysisEvent = new SonarAnalysis(webhookData);

      this.statusEmitter.sendReport(analysisEvent, source);

    } else {
      log.debug("SonarQube webhook data did not contain repo and/or commit-sha data. This event will be ignored.");
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new BadRequestError("SonarQube webhook data did not contain repo and/or commit-sha data. This event will be ignored.")
        )
      );
      return;
    }

    res.sendStatus(204);
  }
}

export default SonarWebhook;
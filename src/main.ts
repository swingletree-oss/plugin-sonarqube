import container from "./ioc-config";
import { TemplateEngine } from "./template/template-engine";
import { log } from "@swingletree-oss/harness";
import { WebServer } from "./webserver";
import { Sonar } from "./client/sonar-issue";
import SonarWebhook from "./webhook";

require("source-map-support").install();

process.on("unhandledRejection", error => {
  // Will print "unhandledRejection err is not defined"
  console.log("unhandledRejection ", error);
});

export class SonarQubePlugin {

  constructor() {
  }

  public run(): void {
    log.info("Starting up SonarQube Plugin...");
    const webserver = container.get<WebServer>(WebServer);

    // add webhook endpoint
    webserver.addRouter("/report", container.get<SonarWebhook>(SonarWebhook).getRouter());

    // add template filter for rule type icons
    container.get<TemplateEngine>(TemplateEngine).addFilter("ruleTypeIcon", SonarQubePlugin.ruleTypeIconFilter);
  }

  public static ruleTypeIconFilter(type: Sonar.model.RuleType | string) {
    if (type == Sonar.model.RuleType.BUG) return "<span title=\"Bugs\"> &#x1F41B;</span>";
    if (type == Sonar.model.RuleType.CODE_SMELL) return "<span title=\"Code Smells\"> &#x2623;&#xFE0F;</span>";
    if (type == Sonar.model.RuleType.VULNERABILITY) return "<span title=\"Vulnerabilities\"> &#x1F480;</span>";
    if (type == Sonar.model.RuleType.SECURITY_HOTSPOT) return "<span title=\"Security Hotspot\"> &#x1F4A3;</span>";

    return type;
  }


}

new SonarQubePlugin().run();

import * as yaml from "js-yaml";
import { injectable } from "inversify";
import * as nconf from "nconf";
import { log } from "@swingletree-oss/harness";

@injectable()
export class ConfigurationService {
  private config: nconf.Provider;

  constructor(file = "./swingletree.conf.yaml") {
    log.info("loading configuration from file %s", file);

    this.config = new nconf.Provider()
      .env({
        lowerCase: true,
        separator: "_",
        match: /((SONAR|LOG)_.*)$/i
      })
      .file({
        file: file,
        format: {
          parse: yaml.safeLoad,
          stringify: yaml.safeDump
        }
      });
  }

  public checkRequired(keys: string[]) {
    this.config.required(keys);
  }

  public get(key: string): string {
    const value: string = this.config.get(key);

    if (!value || value.toString().trim() == "") {
      return null;
    }

    return value;
  }

  public getObject(key: string): any {
    return this.config.get(key);
  }

  public getConfig() {
    return this.config.get();
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  public getBoolean(key: string): boolean {
    return String(this.get(key)) == "true";
  }
}

export enum SonarConfig {
  SECRET = "sonar:secret",
  BASE = "sonar:base",
  CONTEXT = "sonar:context",
  TOKEN = "sonar:token",
  LOG_WEBHOOK_EVENTS = "sonar:debug",
  PORT = "sonar:port",
  SCOTTY_URL = "sonar:urls:scotty"
}
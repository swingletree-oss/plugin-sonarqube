"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
import { ConfigurationService } from "../src/configuration";
import { SonarConfig } from "../src/configuration";
chai.use(require("sinon-chai"));

const sandbox = sinon.createSandbox();

describe("ConfigurationService", () => {

  let uut: ConfigurationService;
  let envBackup;

  beforeEach(() => {
    envBackup = Object.assign({}, process.env);
    process.env = {};
  });

  afterEach(() => {
    process.env = envBackup;
  });

  describe("Sonar", () => {

    it("should use default configuration when no env vars are set", () => {
      uut = new ConfigurationService("./test/config.yml");

      expect(uut.get(SonarConfig.BASE)).to.be.equal("http://localhost:10101");
      expect(uut.get(SonarConfig.TOKEN)).to.be.equal("1234");
      expect(uut.get(SonarConfig.SECRET)).to.be.equal("do not tell");
      expect(uut.get(SonarConfig.CONTEXT)).to.be.equal("sonarqubetest");
    });

    it("should prioritize environment variables", () => {
      process.env["SONAR_BASE"] = "envBase";
      process.env["SONAR:BASE"] = "envBase";
      process.env["SONAR_TOKEN"] = "envToken";
      process.env["SONAR_SECRET"] = "envSecret";
      process.env["SONAR_CONTEXT"] = "envContext";

      uut = new ConfigurationService("./test/config.yml");

      expect(uut.get(SonarConfig.BASE)).to.be.equal("envBase");
      expect(uut.get(SonarConfig.TOKEN)).to.be.equal("envToken");
      expect(uut.get(SonarConfig.SECRET)).to.be.equal("envSecret");
      expect(uut.get(SonarConfig.CONTEXT)).to.be.equal("envContext");
    });
  });

});

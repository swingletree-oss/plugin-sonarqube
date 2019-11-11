"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));
chai.use(require("chai-as-promised"));

import SonarClient from "../../src/client/sonar-client";
import { SonarClientMock } from "../mock-classes";
import { Sonar } from "../../src/client/sonar-issue";

const sandbox = sinon.createSandbox();

const mockPort = 10101;

describe("Integration Test", () => {
  let mockServer: any;
  let sonarClient: SonarClient;

  before(() => {
    const http = require("http");

    mockServer = http.createServer(require("mockserver")("./test/mock", process.env.DEBUG == "true")).listen(mockPort);
    sonarClient = new SonarClientMock();
  });

  after(function () {
    mockServer.close();
  });


  describe("Sonar Client", () => {
    it("should retrieve version", async () => {
      expect(await sonarClient.getVersion()).to.equal("1.2.3-TEST");
    });

    it("should retrieve single measures", async () => {
      expect(
        await sonarClient.getMeasureValue("test", Sonar.model.Metrics.NEW_COVERAGE)
      ).to.equal("90.0");
    });

    it("should retrieve multiple measures", async () => {
      const result = await sonarClient.getMeasures("test", [ Sonar.model.Metrics.NEW_COVERAGE, Sonar.model.Metrics.NEW_VIOLATIONS ]);

      expect(result.measures.get(Sonar.model.Metrics.NEW_COVERAGE).value).to.equal("90.0");
      expect(result.measures.get(Sonar.model.Metrics.NEW_VIOLATIONS).value).to.equal("1");
    });

    it("should retrieve measures from a different branch", async () => {
      const result = await sonarClient.getMeasures("test", [ Sonar.model.Metrics.NEW_COVERAGE, Sonar.model.Metrics.NEW_VIOLATIONS ], "dev");

      expect(result.measures.get(Sonar.model.Metrics.NEW_COVERAGE).value).to.equal("11.0");
      expect(result.measures.get(Sonar.model.Metrics.NEW_VIOLATIONS).value).to.equal("5");
    });

    it("should pick current measure history value on single datasets for history delta", async () => {
      const result = await sonarClient.getMeasureHistoryDelta("current-only", "coverage");

      expect(result).to.have.property("delta", 70.6);
    });

    it("should calculate measure history delta", async () => {
      const result = await sonarClient.getMeasureHistoryDelta("both-values", "coverage");

      expect(result).to.have.property("delta", -19.5);
    });

    it("should return null on delta calculation when missing history", async () => {
      const result = await sonarClient.getMeasureHistoryDelta("no-history", "coverage");

      expect(result).to.be.null;
    });
  });

});

"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));

import SonarStatusEmitter from "../../src/status-emitter";
import { SonarEvents, SonarAnalysis } from "../../src/events";

import { ConfigurationServiceMock, SonarClientMock, TemplateEngineMock, ScottyClientMock } from "../mock-classes";
import { Harness, Events } from "@swingletree-oss/harness";
import ScottyClient from "@swingletree-oss/scotty-client";

describe("Sonar Status Emitter", () => {

  let uut: SonarStatusEmitter;
  let mockServer;
  let analysisData: SonarAnalysis;
  let source: Harness.GithubSource;
  let scottyMock: ScottyClient;

  before(() => {
    const http = require("http");

    const config = {
      get: sinon.stub().returns({
        sonar: {
          base: "http://localhost:10101"
        }
      })
    };

    mockServer = http.createServer(require("mockserver")("./test/mock", process.env.DEBUG == "true")).listen(10101);
  });

  after(function () {
    mockServer.close();
  });

  beforeEach(function () {
    const sonarClientMock = new SonarClientMock();

    uut = new SonarStatusEmitter(
      new ConfigurationServiceMock(),
      sonarClientMock,
      new TemplateEngineMock()
    );

    scottyMock = new ScottyClientMock();
    (uut as any).client = scottyMock;

    source = new Harness.GithubSource();
    source.owner = "test";
    source.repo = "testrepo";
    source.sha = "abc";

    analysisData = {
      analysisEvent: {
        analysedAt: (new Date()).toISOString(),
        branch: {
          isMain: false,
          name: "dev"
        },
        changedAt: (new Date()).toISOString(),
        project: {
          key: "test",
          name: "name"
        },
        properties: { },
        qualityGate: {
          conditions: [],
          name: "test",
          status: "OK"
        },
        serverUrl: "",
        status: "SUCCESS",
        taskId: "task"
      }
    };
  });


  it("should calculate branch delta for short living branches", async () => {
    const result = await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);
    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.has("title", sinon.match("- Coverage: 90.1 (+2.1%)")));
  });

  it("should calculate branch delta for long living branches", async () => {
    analysisData.analysisEvent.branch.isMain = true;
    analysisData.analysisEvent.branch.name = undefined;
    analysisData.analysisEvent.project.key = "test";
    await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);
    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.has("title", sinon.match("- Coverage: 70.6 (-19.5%)")));
  });

  it("should handle failing sonarqube background tasks", async () => {
    analysisData.analysisEvent.branch.name = "dev-no-issues";
    delete analysisData.analysisEvent.qualityGate;
    analysisData.analysisEvent.status = "FAILED";
    await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);
    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.has("checkStatus", sinon.match("analysis_failure")));
    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.has("title", sinon.match("SonarQube task failure")));
  });

  it("should handle missing qualityGates", async () => {
    analysisData.analysisEvent.branch.name = "dev-no-issues";
    delete analysisData.analysisEvent.qualityGate;
    await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);
    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.has("checkStatus", sinon.match("undecisive")));
  });

  it("should handle happy case", async () => {
    analysisData.analysisEvent.branch.name = "dev-no-issues";
    await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);
    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.has("checkStatus", sinon.match("passed")));
  });

  it("should not contain undefined annotation paths in GitHub check run", async () => {
    analysisData.analysisEvent.project.key = "component-subproject-test";
    await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);

    sinon.assert.calledWith(scottyMock.sendReport as any,
      sinon.match.has("annotations",
        sinon.match.every(
          sinon.match.has("path", sinon.match((path) => { return path; }))
        )
      )
    );
  });

  it("should determine annotation paths", async () => {
    analysisData.analysisEvent.project.key = "component-subproject-test";
    await uut.sendReport(analysisData, source, "testid");

    sinon.assert.calledOnce(scottyMock.sendReport as any);

    sinon.assert.calledWith(scottyMock.sendReport as any, sinon.match.hasNested("annotations[0]",
      sinon.match.has("path", "backend/src/main/java/testpkg/Constants.java"))
    );
  });

  it("should set start and end lines", async () => {
    analysisData.analysisEvent.project.key = "component-subproject-test";

    const result = await uut.sendReport(analysisData, source, "testid");

    const annotation = result.annotations.find(it => {
      return (it instanceof Harness.FileAnnotation) &&
        (it as Harness.FileAnnotation).metadata["hash"] == "3d6a09cb1d3c2ab9cb077ee21a0c5cae";
    }) as Harness.FileAnnotation;

    expect(annotation.start).to.be.equal(14);
    expect(annotation.end).to.be.equal(15);
  });

});

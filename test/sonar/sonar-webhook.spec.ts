"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));

import { Response, Request, NextFunction } from "express";

import SonarWebhook from "../../src/webhook";

import { ConfigurationService } from "../../src/configuration";
import { ConfigurationServiceMock, StatusEmitterMock } from "../mock-classes";
import SonarStatusEmitter from "../../src/status-emitter";

describe("Sonar Webhook", () => {

  let uut: SonarWebhook;
  let testData: any;
  let statusEmitterMock: SonarStatusEmitter;
  let responseMock: any;

  beforeEach(function () {

    const configurationMock = new ConfigurationServiceMock();
    configurationMock.get = sinon.stub().returns({
      context: "test",
      sonar: {
        logWebhookEvents: false
      }
    });

    responseMock = {sendStatus: sinon.stub()};

    testData = Object.assign({}, require("../mock/webhook/base.json"));
    // reset test data properties for test cases
    testData.properties = {};

    statusEmitterMock = new StatusEmitterMock();

    uut = new SonarWebhook(
      configurationMock as ConfigurationService,
      statusEmitterMock
    );
  });


  it("should send commit status event on relevant hook", async () => {

    testData.properties = {
      "sonar.analysis.commitId": "12345",
      "sonar.analysis.repository": "testOrg/testRepo"
    };

    await uut.webhook({ body: { data: { report: testData } } } as Request, responseMock);

    sinon.assert.calledWith(statusEmitterMock.sendReport as any, sinon.match.any, sinon.match.has("sha", "12345"));
    sinon.assert.calledWith(statusEmitterMock.sendReport as any, sinon.match.any, sinon.match.has("owner", "testOrg"));
    sinon.assert.calledWith(statusEmitterMock.sendReport as any, sinon.match.any, sinon.match.has("repo", "testRepo"));
  });

});

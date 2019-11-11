"use strict";

import { describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));

import SonarClient from "../../src/client/sonar-client";
import { ConfigurationServiceMock } from "../mock-classes";
import { ConfigurationService } from "../../src/configuration";
import { SonarConfig } from "../../src/configuration";

const sandbox = sinon.createSandbox();

describe("Sonar Client integration", () => {
  const mockPort = 10101;
  let mockServer: any;
  let uut: SonarClient;

  let configurationMock: ConfigurationService;

  before(() => {
    const http = require("http");

    mockServer = http.createServer(require("mockserver")("./test/mock", process.env.DEBUG == "true")).listen(mockPort);
  });

  after(function () {
    mockServer.close();
  });


  beforeEach(function () {
    configurationMock = new ConfigurationServiceMock();

    configurationMock.get = sinon.stub();
    (configurationMock.get as any).withArgs(SonarConfig.BASE).returns("http://localhost:10101");

    uut = new SonarClient(configurationMock);
  });

  afterEach(function () {
    sandbox.restore();
  });


  it("should calculate main analysis measure history delta", async () => {
    const result = await uut.getMeasureHistoryDelta("test", "coverage");
    expect(result.coverage).to.equal(70.6);
    expect(result.delta).to.equal(-19.5);
  });

  it("should be able to handle empty measure history", async () => {
    const result = await uut.getMeasureHistoryDelta("no-history", "coverage");
    expect(result).to.be.null;
  });
});

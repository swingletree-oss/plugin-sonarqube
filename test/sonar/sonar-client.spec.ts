"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import * as chai from "chai";
import * as sinon from "sinon";
chai.use(require("sinon-chai"));

import SonarClient from "../../src/client/sonar-client";
import { ConfigurationServiceMock } from "../mock-classes";

const sandbox = sinon.createSandbox();

describe("Sonar Client", () => {
  let uut: SonarClient;

  beforeEach(function () {

    const configurationMock = new ConfigurationServiceMock();

    uut = new SonarClient(configurationMock);
  });

  afterEach(function () {
    sandbox.restore();
  });


  it("should indicate paging requirement", () => {
    const paging = {
      pageIndex: 1,
      pageSize: 1,
      total: 100
    };
    chai.assert.isTrue(uut.pagingNecessary(paging));
  });

  it("should not page too much", () => {
    const paging = {
      pageIndex: 3,
      pageSize: 1,
      total: 3
    };
    chai.assert.isFalse(uut.pagingNecessary(paging));
  });

});

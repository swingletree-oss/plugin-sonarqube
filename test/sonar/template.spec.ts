"use strict";

import * as chai from "chai";
import { describe } from "mocha";
import { expect } from "chai";
import * as sinon from "sinon";

import * as fs from "fs";
import { TemplateEngine, Templates } from "../../src/template/template-engine";
import { SonarCheckRunSummaryTemplate } from "../../src/sonar-template";

chai.use(require("sinon-chai"));

describe("Templating", () => {

  let uut: TemplateEngine;
  let testData: SonarCheckRunSummaryTemplate;

  beforeEach( async() => {
    uut = new TemplateEngine();

    testData = {
      event: Object.assign({}, require("../mock/webhook/base.json")),
      annotationsCapped: true,
      totalIssues: 12
    };
  });

  it(`should generate markdown report from template`, async () => {
    const markdown = uut.template(Templates.CHECK_RUN_SUMMARY, testData);

    expect(markdown).to.be.not.undefined;
    expect(markdown).to.include("Quality Gate");
  });

  it(`should handle missing quality gate property`, async () => {
    delete testData.event.qualityGate;

    const markdown = uut.template(Templates.CHECK_RUN_SUMMARY, testData);

    expect(markdown).to.be.not.undefined;
    expect(markdown).to.not.include("Quality Gate");
  });

});
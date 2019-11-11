import { ConfigurationService, SonarConfig } from "../src/configuration";
import * as sinon from "sinon";
import SonarClient from "../src/client/sonar-client";
import { TemplateEngine } from "../src/template/template-engine";
import ScottyClient from "@swingletree-oss/scotty-client";
import { Comms } from "@swingletree-oss/harness";
import SonarStatusEmitter from "../src/status-emitter";


export class ConfigurationServiceMock extends ConfigurationService {
  constructor() {
    super();
    const configStub = sinon.stub();
    configStub.withArgs(SonarConfig.BASE).returns("http://localhost:10101");

    this.get = configStub;
  }
}

export class SonarClientMock extends SonarClient {
  constructor(configService = new ConfigurationServiceMock()) {
    super(configService);
  }
}

export class TemplateEngineMock extends TemplateEngine {
  constructor() {
    super();

    this.addFilter = sinon.stub();
    this.template = sinon.stub().returns("stubbed template text");
  }
}

export class ScottyClientMock extends ScottyClient {
  constructor() {
    super("");

    this.getRepositoryConfig = sinon.stub().resolves(new Comms.Message.EmptyMessage());
    this.sendReport = sinon.stub().resolves();
  }
}

export class StatusEmitterMock extends SonarStatusEmitter {
  constructor() {
    super(
      new ConfigurationServiceMock(),
      new SonarClientMock(),
      new TemplateEngineMock()
    );

    this.sendReport = sinon.stub().resolves();
  }
}

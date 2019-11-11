import "reflect-metadata";

import { Container } from "inversify";

import { ConfigurationService } from "./configuration";
import { TemplateEngine } from "./template/template-engine";
import { WebServer } from "./webserver";
import SonarStatusEmitter from "./status-emitter";
import SonarWebhook from "./webhook";
import SonarClient from "./client/sonar-client";


const container = new Container();

container.bind<ConfigurationService>(ConfigurationService).toSelf().inSingletonScope();
container.bind<SonarStatusEmitter>(SonarStatusEmitter).toSelf().inSingletonScope();
container.bind<SonarWebhook>(SonarWebhook).toSelf().inSingletonScope();
container.bind<SonarClient>(SonarClient).toSelf().inSingletonScope();
container.bind<WebServer>(WebServer).toSelf().inSingletonScope();
container.bind<TemplateEngine>(TemplateEngine).toSelf().inSingletonScope();


export default container;
import { log } from "@swingletree-oss/harness";
import * as compression from "compression";
import * as express from "express";
import { inject, injectable } from "inversify";
import { ConfigurationService, SonarConfig } from "./configuration";
import bodyParser = require("body-parser");

@injectable()
export class WebServer {
  private app: express.Express;

  private port: number;

  constructor(
    @inject(ConfigurationService) configService: ConfigurationService
  ) {
    this.app = express();

    this.port = configService.getNumber(SonarConfig.PORT);

    this.initialize();
  }

  private initialize() {
    log.info("initializing server...");

    const maxBodySize = process.env["MAX_BODY_SIZE"] || "1mb";
    log.info("setting max body-size to %s", maxBodySize);

    // express configuration
    this.app.set("port", this.port);
    this.app.use(compression());
    this.app.use(bodyParser.json({
      limit: maxBodySize
    }));
    this.app.use(bodyParser.urlencoded({
      limit: maxBodySize,
      extended: true
    }));

    // set common headers
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.header("X-Frame-Options", "DENY");
      res.header("X-XSS-Protection", "1");
      res.header("X-Content-Type-Options", "nosniff");
      next();
    });

    // disable server reveal
    this.app.disable("x-powered-by");

    // set rendering engine
    this.app.set("view engine", "pug");

    // health endpoint
    this.app.get("/health", (request: express.Request, response: express.Response) => {
      response.sendStatus(200);
    });

    // error handling
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      // only provide error details in development mode
      const visibleError = req.app.get("env") === "development" ? err : {};

      res.status(err.status || 500);
      res.send(visibleError);
    });

    // kickstart everything
    this.app.listen(this.app.get("port"), () => {
      log.info("listening on http://localhost:%d in %s mode", this.app.get("port"), this.app.get("env"));
    });
  }

  public addRouter(path: string, router: express.Router) {
    log.debug("adding http endpoint %s", path);
    this.app.use(path, router);
  }

  public setLocale(key: string, data: any) {
    log.debug("adding locals entry for key %s", key);
    this.app.locals[key] = data;
  }
}

export interface SonarRepoConfig {
  blockCoverageLoss: boolean;
}

export class DefaultRepoConfig implements SonarRepoConfig {
  enabled: boolean;
  blockCoverageLoss: boolean;

  constructor(repoConfig?: SonarRepoConfig) {
    if (repoConfig) {
      this.blockCoverageLoss = repoConfig.blockCoverageLoss;
    } else {
      this.enabled = false;
      this.blockCoverageLoss = false;
    }
  }
}
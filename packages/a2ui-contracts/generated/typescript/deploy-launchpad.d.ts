/* Auto-generated from deploy-launchpad.schema.json — do not edit */

/**
 * Deploy Launchpad 템플릿의 payload schema
 */
export interface DeployLaunchpadPayload {
  templateId: "deploy_launchpad";
  state: "ready" | "deploying" | "done";
  /**
   * 서비스명
   */
  service: string;
  environment: "production" | "staging" | "development";
  /**
   * 추천 버전
   */
  recommendedVersion?: string;
  /**
   * 배포 대상 버전
   */
  targetVersion: string;
  strategy: "rolling" | "bluegreen" | "canary";
  /**
   * 배포 영향 요약
   */
  impactSummary?: string;
  preflightChecks?: string[];
  helperText?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  imageDetail?: {
    repository?: string;
    imageTag?: string;
    imageUri?: string;
    gitRef?: string;
    commitSha?: string;
    imageDigest?: string;
    buildStatus?: string;
    pushedAt?: string;
  };
  requestDetail?: {
    selectedImageId?: string;
    selectedImageUri?: string;
    service?: string;
    environment?: string;
    cpu?: string;
    memory?: string;
    containerPort?: string;
    desiredCount?: string;
    minimumHealthyPercent?: string;
    maximumPercent?: string;
    deploymentStrategy?: string;
    healthCheckPath?: string;
    healthCheckGracePeriod?: string;
    rollbackBaseline?: string;
    requestedBy?: string;
    executionProfile?: string;
    operatorNote?: string;
  };
  /**
   * LLM resolver가 생성하는 배포 리스크 요약
   */
  riskSummary?: string;
}

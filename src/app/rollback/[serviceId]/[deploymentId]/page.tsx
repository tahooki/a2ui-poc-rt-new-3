import { RollbackTargetDetailPage } from "@/devops-console/pages/rollback-target-detail-page";

export default async function RollbackTargetPage({
  params,
}: {
  params: Promise<{ serviceId: string; deploymentId: string }>;
}) {
  const { deploymentId, serviceId } = await params;

  return <RollbackTargetDetailPage deploymentId={deploymentId} serviceId={serviceId} />;
}

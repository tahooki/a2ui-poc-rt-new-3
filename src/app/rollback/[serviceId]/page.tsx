import { RollbackServiceDetailPage } from "@/devops-console/pages/rollback-service-detail-page";

export default async function RollbackServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;

  return <RollbackServiceDetailPage serviceId={serviceId} />;
}

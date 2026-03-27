import { ApproveDetailPage } from "@/devops-console/pages/approve-detail-page";

export default async function ApproveRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  return <ApproveDetailPage requestId={requestId} />;
}

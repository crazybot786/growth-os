import { LeadDetail } from './ui';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return <LeadDetail leadId={params.id} />;
}


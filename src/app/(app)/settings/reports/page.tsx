import { redirect } from 'next/navigation';
import { getContentReports } from '@/lib/actions/reports';
import { ReportsClient } from './reports-client';

export const metadata = { title: 'البلاغات — Chof Khdemti' };

export default async function ReportsPage() {
  // getContentReports resolves the caller's moderation capabilities; a user
  // without can_view_reports is bounced before any report markup renders.
  const { caps, reports } = await getContentReports();
  if (!caps.canViewReports) redirect('/settings');

  return <ReportsClient initialReports={reports} caps={caps} />;
}

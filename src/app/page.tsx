import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import Landing from './Landing';

export default async function Page() {
  if (await currentUser()) redirect('/history');
  return <Landing />;
}

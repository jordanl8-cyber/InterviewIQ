import { redirect } from 'next/navigation';
import AccountForm from '@/components/AccountForm';
import { currentUser } from '@/lib/auth';

export default async function Page() {
  const user = await currentUser();
  if (user && !user.isAnonymous) redirect('/history');
  return <AccountForm signup={false} />;
}

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { store } from '@/lib/store';
import NewSessionForm from './NewSessionForm';

export default async function Page({ searchParams }: { searchParams: Promise<{ reset?: string; edit?: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/signup');
  const { reset, edit } = await searchParams;
  return <NewSessionForm userName={user.name} job={edit || reset ? null : store.latestJob(user.id)} reset={reset === '1'} />;
}

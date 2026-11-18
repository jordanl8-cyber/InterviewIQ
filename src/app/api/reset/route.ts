import { currentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getSupermemory } from '@/lib/supermemory';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Sign in to continue' }, { status: 401 });
    const origin = req.headers.get('origin');
    const trustedOrigin = process.env.BETTER_AUTH_URL || `${req.nextUrl.protocol}//${req.headers.get('host')}`;
    if (origin !== new URL(trustedOrigin).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    const { confirm } = await req.json();
    if (confirm !== true) return NextResponse.json({ error: 'Confirm reset first' }, { status: 400 });
    const userName = user.id;

    store.clearUser(userName);

    if (!process.env.SUPERMEMORY_API_KEY) return NextResponse.json({ success: true });

    // Clear optional Supermemory records for this owner.
    // Search and delete all records tagged with this user
    try {
      const client = getSupermemory();
      const types = ['weakness_profile', 'session_report', 'category_record'];
      for (const type of types) {
        const results = await client.search.execute({
          q: '*',
          containerTags: [`user_${userName}`],
          filters: { AND: [{ key: 'type', value: type }] },
        });
        if (results.results) {
          for (const result of results.results) {
            try {
              const id = (result as any).id;
              if (id) {
                await client.delete(id);
              }
            } catch {
              // Skip individual deletion failures
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to clear Supermemory data (non-critical):', err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reset failed:', err);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}

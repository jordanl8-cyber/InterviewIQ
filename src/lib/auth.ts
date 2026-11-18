import { betterAuth } from 'better-auth';
import { anonymous } from 'better-auth/plugins/anonymous';
import { headers } from 'next/headers';
import { db } from './database';

const auth = betterAuth({
  appName: 'InterviewIQ',
  database: db,
  baseURL: process.env.BETTER_AUTH_URL || {
    allowedHosts: ['localhost:3000', '127.0.0.1:3000'], protocol: 'http',
  },
  emailAndPassword: { enabled: true, minPasswordLength: 10 },
  plugins: [anonymous({
    onLinkAccount: async ({ anonymousUser, newUser }) => {
      db.prepare('UPDATE interviews SET owner = ? WHERE owner = ?')
        .run(newUser.user.id, anonymousUser.user.id);
    },
  })],
});

declare global {
  var interviewAuthSchema: Promise<void> | undefined;
}
export async function getAuth() {
  await (globalThis.interviewAuthSchema ??= auth.$context.then(ctx => ctx.runMigrations()).catch(error => {
    globalThis.interviewAuthSchema = undefined;
    throw error;
  }));
  return auth;
}

export async function currentUser() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

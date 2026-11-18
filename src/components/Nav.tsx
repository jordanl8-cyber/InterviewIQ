'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import styles from './Nav.module.css';

export default function Nav({ signedIn, guest }: { signedIn: boolean; guest: boolean }) {
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  async function signOut() {
    try {
      const { authClient } = await import('@/lib/auth-client');
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      window.location.replace('/');
    } catch { setLogoutError(true); }
  }
  const session = pathname.startsWith('/session/');
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <a href="/" className={styles.brand}><span className={styles.diamond} aria-hidden="true" />InterviewIQ</a>
        <button ref={menuButton} className={styles.menu} aria-controls="main-links" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'}</button>
        <div id="main-links" className={styles.links} data-open={open} onClick={() => setOpen(false)} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); menuButton.current?.focus(); } }}>
          {!signedIn && !guest ? <>
            {pathname === '/' && <a href="#preview">Sample questions</a>}
            <a href="/login">Sign in</a><a className={styles.action} href="/signup">Create account</a>
          </> : <>
            {!session && <a href="/new">Next interview</a>}
            <a href="/history" aria-current={pathname === '/history' ? 'page' : undefined}>Your interviews</a>
            {!session && <a href="/progress" aria-current={pathname === '/progress' ? 'page' : undefined}>Progress</a>}
            {guest ? <a className={styles.action} href="/signup">Create account</a>
              : <button className={styles.action} onClick={signOut}>Sign out</button>}
            {logoutError && <span role="alert">Couldn’t sign out. Try again.</span>}
          </>}
        </div>
      </nav>
    </header>
  );
}

'use client';

import { LoginForm } from '../../component/LoginForm';

export default function Page() {
  return (
        <main style={{
          alignItems: 'center',
          background: 'url("https://res.cloudinary.com/dci1eujqw/image/upload/v1616769558/Codepen/waldemar-brandt-aThdSdgx0YM-unsplash_cnq4sb.jpg")',
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          display: 'grid',
          height: '100vh',
          placeItems: 'center',
          margin: 0,
          padding: 0
        }}>
          <LoginForm />
        </main>
  );
}
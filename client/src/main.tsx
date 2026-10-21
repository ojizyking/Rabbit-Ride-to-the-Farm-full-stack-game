import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

const PUBLISHABLE_KEY = (import.meta.env.CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) as string | undefined;

async function bootstrap() {
  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

  if (PUBLISHABLE_KEY) {
    // Clerk available — load provider dynamically so build doesn't hard-crash without key
    const { ClerkProvider } = await import('@clerk/clerk-react');
    root.render(
      <React.StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <App />
        </ClerkProvider>
      </React.StrictMode>
    );
  } else {
    // No Clerk key — render without Clerk (legacy email/password auth still works)
    console.warn('[RabbitRide] CLERK_PUBLISHABLE_KEY not set — running without Clerk.');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

bootstrap();

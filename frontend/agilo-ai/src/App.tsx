import { useState } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './components/dashboard/DashboardPage';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  return (
    <div className="w-screen h-dvh overflow-hidden bg-agilo-bg text-agilo-text">
      {!isAuthenticated ? (
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <DashboardPage onLogout={() => setIsAuthenticated(false)} />
      )}
    </div>
  );
}

export default App;

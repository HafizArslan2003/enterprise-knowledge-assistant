import { useState } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardPage } from './components/dashboard/DashboardPage';

export function App() {
  // Persist session across page refreshes by reading token from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('agilo-access-token')
  );

  const handleLogout = () => {
    localStorage.removeItem('agilo-access-token');
    localStorage.removeItem('agilo-token-type');
    setIsAuthenticated(false);
  };

  return (
    <div className="w-screen h-dvh overflow-hidden bg-agilo-bg text-agilo-text">
      {!isAuthenticated ? (
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <DashboardPage onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;

import React from 'react';
import Footer from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-8">{children}</main>
      <Footer />
    </div>
  );
};

export default AppLayout; 
import React from 'react';

// This is a shared layout component. It provides a consistent header and
// structure for all pages in the application.
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 font-sans">
      <header>
        <h1 className="text-5xl font-bold text-blue-600 mb-8">SportSphere</h1>
      </header>
      <main className="w-full max-w-md">
        {children}
      </main>
    </div>
  );
};

export default Layout;
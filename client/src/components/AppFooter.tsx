import React from 'react';

const AppFooter: React.FC = () => {
  return (
    <footer className="bg-neutral-dark text-white p-4 mt-auto">
      <div className="container mx-auto text-center text-sm">
        <p>© {new Date().getFullYear()} FIR Registration System. All rights reserved.</p>
        <p className="mt-1">Powered by Gemini AI. For official use only.</p>
      </div>
    </footer>
  );
};

export default AppFooter;

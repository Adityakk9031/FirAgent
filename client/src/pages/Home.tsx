import React, { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import FIRStatusPanel from '@/components/FIRStatusPanel';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';

const Home: React.FC = () => {
  const [currentFirId, setCurrentFirId] = useState<string | null>(null);

  const handleFirCreated = (firId: string) => {
    setCurrentFirId(firId);
  };

  return (
    <div className="min-h-screen bg-neutral-lightest flex flex-col">
      <AppHeader />
      
      <main className="flex-grow container mx-auto p-4 md:py-6 flex flex-col md:flex-row gap-6">
        <section className="md:w-1/2 flex flex-col">
          <ChatInterface onFirCreated={handleFirCreated} />
        </section>
        
        <section className="md:w-1/2 flex flex-col">
          <FIRStatusPanel firId={currentFirId} />
        </section>
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Home;

import React, { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import FIRStatusPanel from '@/components/FIRStatusPanel';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield } from 'lucide-react';

const Home: React.FC = () => {
  const [currentFirId, setCurrentFirId] = useState<string | null>(null);

  const handleFirCreated = (firId: string) => {
    setCurrentFirId(firId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <AppHeader />
      
      {/* Hero section */}
      <div className="bg-gradient-to-r from-primary/90 to-primary text-white py-8 mb-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/90">
                First Information Report System
              </h1>
              <p className="text-lg opacity-90 mb-6">
                Use advanced AI to analyze and process incident reports efficiently.
                Extract key details, generate official documents, and track case status.
              </p>
            </div>
            <div className="hidden md:flex justify-center">
              <Shield size={120} className="text-white/30" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content with desktop & mobile layouts */}
      <main className="flex-grow container mx-auto px-4 pb-8">
        {/* Desktop view: Side-by-side panels */}
        <div className="hidden md:flex gap-6">
          <section className="w-1/2 flex flex-col">
            <ChatInterface onFirCreated={handleFirCreated} />
          </section>
          
          <section className="w-1/2 flex flex-col">
            <FIRStatusPanel firId={currentFirId} />
          </section>
        </div>
        
        {/* Mobile view: Tabbed interface */}
        <div className="md:hidden">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="chat">Chat Interface</TabsTrigger>
              <TabsTrigger value="status">FIR Status</TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
              <ChatInterface onFirCreated={handleFirCreated} />
            </TabsContent>
            <TabsContent value="status">
              <FIRStatusPanel firId={currentFirId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Home;

import React from 'react';
import { Shield, Code, Info, GitMerge } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const AppFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col">
            <div className="flex items-center mb-3">
              <Shield className="h-5 w-5 text-primary mr-2" />
              <h3 className="font-bold text-primary">FIR-AI System</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Advanced AI-powered First Information Report system for efficient crime reporting and tracking.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium mb-3 text-sm">Resources</h4>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Documentation</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">API Reference</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Training Manual</a>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium mb-3 text-sm">Legal</h4>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Privacy Policy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Terms of Service</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Compliance</a>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium mb-3 text-sm">About</h4>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">Contact</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary hover:underline block">System Status</a>
            <div className="flex items-center mt-4">
              <Code className="h-4 w-4 text-muted-foreground mr-1" />
              <Info className="h-4 w-4 text-muted-foreground mx-1" />
              <GitMerge className="h-4 w-4 text-muted-foreground mx-1" />
            </div>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FIR Registration System. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-2 md:mt-0">
            Powered by Gemini AI. For official use only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;

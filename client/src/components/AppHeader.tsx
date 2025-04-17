import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  HelpCircle, 
  Settings, 
  Shield, 
  Search, 
  BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AppHeader: React.FC = () => {
  const { toast } = useToast();

  const handleHelpClick = () => {
    toast({
      title: "FIR Registration Help",
      description: "This system helps you register First Information Reports (FIRs) using AI technology. Simply describe the incident in detail, and the system will help you create an official FIR.",
      duration: 5000,
    });
  };

  const handleSettingsClick = () => {
    toast({
      title: "Settings",
      description: "Settings functionality is coming soon.",
      duration: 3000,
    });
  };

  return (
    <header className="bg-white border-b px-4 py-3 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
            FIR-AI System
          </h1>
          <Badge variant="outline" className="ml-2 hidden md:flex">
            v1.0
          </Badge>
        </div>
        
        <div className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Button variant="link" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
            <FileText className="h-4 w-4" />
            <span>Reports</span>
          </Button>
          <Button variant="link" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
            <Search className="h-4 w-4" />
            <span>Search FIRs</span>
          </Button>
          <Button variant="link" className="flex items-center gap-1 text-muted-foreground hover:text-primary">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHelpClick}
            className="rounded-full"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Help</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>System Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Documentation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="default" size="sm" className="ml-2 hidden md:flex">
            <FileText className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getFir, getStatusUpdates, getFirPdfUrl } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@shared/utils';
import { FIR, StatusUpdate } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface FIRStatusPanelProps {
  firId: string | null;
}

interface StatusItemProps {
  status: string;
  timestamp: string;
  description: string;
  completed: boolean;
}

// Status timeline item component
const StatusItem: React.FC<StatusItemProps> = ({ status, timestamp, description, completed }) => (
  <div className="flex mb-6 relative">
    <div className={`h-8 w-8 rounded-full ${completed ? 'bg-green-500' : 'bg-gray-200'} text-white flex items-center justify-center z-10`}>
      {completed ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hourglass text-gray-500">
          <path d="M5 22h14"/>
          <path d="M5 2h14"/>
          <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
          <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
        </svg>
      )}
    </div>
    <div className="ml-4">
      <p className="font-medium">{status}</p>
      <p className="text-sm text-muted-foreground">{timestamp || 'Pending'}</p>
      <p className="text-sm mt-1">{description}</p>
    </div>
  </div>
);

const FIRStatusPanel: React.FC<FIRStatusPanelProps> = ({ firId }) => {
  const { toast } = useToast();
  
  // FIR details query
  const { 
    data: fir, 
    isLoading: isLoadingFir,
    isError: isErrorFir
  } = useQuery({
    queryKey: firId ? [`/api/firs/${firId}`] : null,
    enabled: !!firId
  });
  
  // Status updates query
  const { 
    data: statusUpdates, 
    isLoading: isLoadingStatus 
  } = useQuery({
    queryKey: firId ? [`/api/firs/${firId}/status-updates`] : null,
    enabled: !!firId
  });

  const handleDownloadPDF = () => {
    if (!firId) return;
    
    // Open PDF in new tab
    window.open(getFirPdfUrl(firId), '_blank');
  };

  const handleContactOfficer = () => {
    toast({
      title: "Contact Information",
      description: "Contact functionality is coming soon.",
      duration: 3000,
    });
  };

  // Show message when no FIR is selected
  if (!firId) {
    return (
      <div className="flex flex-col space-y-6">
        <Card>
          <CardContent className="pt-6 flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-question mx-auto mb-4">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M10 13a1.5 1.5 0 1 1-1.14-1.474"/>
                <path d="M9.89 16h.03"/>
              </svg>
              <p>No FIR has been generated yet</p>
              <p className="text-sm mt-2">Describe an incident in the chat to generate an FIR</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoadingFir) {
    return (
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader className="px-4 py-4 border-b flex justify-between items-center">
            <CardTitle className="text-lg font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text mr-2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
                <line x1="10" x2="8" y1="9" y2="9"/>
              </svg>
              FIR Details
            </CardTitle>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (isErrorFir || !fir) {
    return (
      <div className="flex flex-col space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle mx-auto mb-4 text-red-500">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" x2="12" y1="8" y2="12"/>
                <line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
              <p>Error loading FIR details</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process status updates
  const processedStatusUpdates = statusUpdates || [];
  
  // Default status stages if no updates available
  const defaultStatuses = [
    { 
      status: "FIR Registered", 
      description: `FIR has been registered in the system with ID ${firId}`,
      timestamp: fir.createdAt,
      completed: true
    },
    { 
      status: "Investigation Pending", 
      description: "Investigation has not yet been initiated",
      timestamp: "",
      completed: false
    },
    { 
      status: "Evidence Collection", 
      description: "No evidence has been collected yet",
      timestamp: "",
      completed: false
    },
    { 
      status: "Case Resolution", 
      description: "Case has not been resolved yet",
      timestamp: "",
      completed: false
    }
  ];

  // Map actual status updates and combine with defaults
  const statusMap = new Map();
  processedStatusUpdates.forEach(update => {
    statusMap.set(update.status, {
      status: update.status,
      description: update.description,
      timestamp: update.timestamp,
      completed: true
    });
  });
  
  // Create final status list
  const statusList = defaultStatuses.map(status => {
    return statusMap.has(status.status) ? statusMap.get(status.status) : status;
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* FIR Details Card */}
      <Card>
        <CardHeader className="px-4 py-4 border-b flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text mr-2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" x2="8" y1="13" y2="13"/>
              <line x1="16" x2="8" y1="17" y2="17"/>
              <line x1="10" x2="8" y1="9" y2="9"/>
            </svg>
            FIR Details
          </CardTitle>
          <Badge className="bg-green-500">{fir.status}</Badge>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">FIR ID</p>
              <p className="font-mono font-medium">{fir.firId}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Crime Type</p>
              <p className="capitalize">{fir.crime}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">IPC Sections</p>
              <div className="flex flex-wrap gap-2">
                {fir.ipcSections.map((section, index) => (
                  <Badge key={index} variant="secondary" className="bg-muted rounded-full">
                    {section}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
              <p>{fir.dateTime || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location</p>
              <p>{fir.location || 'Not specified'}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Summary</p>
              <p className="text-sm">{fir.summary}</p>
            </div>
            
            <div className="mt-2">
              <Button 
                onClick={handleDownloadPDF}
                className="bg-primary text-white hover:bg-primary/90 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                Download FIR PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Case Tracking Card */}
      <Card>
        <CardHeader className="px-4 py-4 border-b">
          <CardTitle className="text-lg font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity mr-2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Case Tracking
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200"></div>
            
            {/* Status Items */}
            {statusList.map((item, index) => (
              <StatusItem 
                key={index}
                status={item.status}
                timestamp={item.timestamp ? formatDate(item.timestamp) : ''}
                description={item.description}
                completed={item.completed}
              />
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="font-medium mb-2">Have questions about your case?</p>
            <Button 
              variant="outline" 
              className="text-primary border-primary hover:bg-primary/10 flex items-center"
              onClick={handleContactOfficer}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone mr-1">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Contact Investigating Officer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FIRStatusPanel;

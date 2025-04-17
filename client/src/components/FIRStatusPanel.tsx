import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getFir, getStatusUpdates, getFirPdfUrl } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@shared/utils';
import { useToast } from '@/hooks/use-toast';
import { FIR, StatusUpdate } from '@/types';
import { 
  FileText, 
  Activity, 
  AlertCircle, 
  Download, 
  Phone, 
  Calendar, 
  MapPin, 
  Scale, 
  CheckCircle2, 
  Clock, 
  FileQuestion,
  ExternalLink,
  Tag
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
  <div className="flex mb-8 relative">
    <div className={`h-10 w-10 rounded-full ${
      completed 
        ? 'bg-primary text-white' 
        : 'bg-neutral-100 border border-neutral-200'
      } flex items-center justify-center z-10 shadow-sm`}
    >
      {completed ? (
        <CheckCircle2 size={20} />
      ) : (
        <Clock size={18} className="text-muted-foreground" />
      )}
    </div>
    <div className="ml-4">
      <div className="flex items-center mb-1">
        <p className="font-semibold text-gray-800">{status}</p>
        {timestamp && (
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            {timestamp}
          </Badge>
        )}
      </div>
      {!timestamp && <p className="text-xs text-amber-600 font-medium mb-1">Pending</p>}
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
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
  } = useQuery<FIR>({
    queryKey: firId ? [`/api/firs/${firId}`] : ['empty'],
    enabled: !!firId
  });
  
  // Status updates query
  const { 
    data: statusUpdates, 
    isLoading: isLoadingStatus 
  } = useQuery<StatusUpdate[]>({
    queryKey: firId ? [`/api/firs/${firId}/status-updates`] : ['empty-status'],
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
      <Card className="flex flex-col h-full border-none shadow-lg">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mr-3">
              <FileQuestion className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">FIR Status Panel</CardTitle>
              <CardDescription>Track your case status and details</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow p-0">
          <div className="flex items-center justify-center h-[400px] flex-col p-6">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">No FIR Selected</h3>
            <p className="text-center text-muted-foreground max-w-xs">
              Describe an incident in the chat interface to generate a new First Information Report.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (isLoadingFir) {
    return (
      <Card className="flex flex-col h-full border-none shadow-lg">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mr-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">FIR Details</CardTitle>
                <CardDescription>Loading case information...</CardDescription>
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        
        <CardContent className="p-5">
          <div className="space-y-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isErrorFir || !fir) {
    return (
      <Card className="flex flex-col h-full border-none shadow-lg">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Error</CardTitle>
              <CardDescription>Unable to load FIR details</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow p-0">
          <div className="flex items-center justify-center h-[400px] flex-col p-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">Unable to Load FIR</h3>
            <p className="text-center text-muted-foreground mb-6">
              There was a problem loading the FIR details. Please try again later.
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="border-neutral-200"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
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

  // Map priority to colors
  const getPriorityColor = (priority: number) => {
    switch(priority) {
      case 1: return "bg-green-100 text-green-800 border-green-200";
      case 2: return "bg-blue-100 text-blue-800 border-blue-200";
      case 3: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 4: return "bg-orange-100 text-orange-800 border-orange-200";
      case 5: return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityText = (priority: number) => {
    switch(priority) {
      case 1: return "Low";
      case 2: return "Medium-Low";
      case 3: return "Medium";
      case 4: return "Medium-High";
      case 5: return "High";
      default: return "Unknown";
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* FIR Details Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-xl flex justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">FIR Details</CardTitle>
              <CardDescription>Case information and summary</CardDescription>
            </div>
          </div>
          
          <Badge className={`${fir.status === "REGISTERED" ? "bg-green-100 text-green-800 border border-green-200" : "bg-blue-100 text-blue-800 border border-blue-200"} font-medium py-1 px-3`}>
            {fir.status}
          </Badge>
        </CardHeader>
        
        <CardContent className="px-5 py-4">
          <div className="space-y-5">
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100">
              <div className="flex items-center gap-2 text-primary font-medium mb-2">
                <FileText size={16} />
                <span>FIR #{fir.firId}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  <span>Filed on {formatDate(fir.createdAt)}</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`${getPriorityColor(fir.priority)} px-2 py-0.5`}
                >
                  {getPriorityText(fir.priority)} Priority
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag size={14} className="text-muted-foreground" />
                  Crime Type
                </label>
                <p className="capitalize text-lg font-medium text-gray-800">{fir.crime}</p>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Scale size={14} className="text-muted-foreground" />
                  IPC Sections
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {fir.ipcSections.map((section, index) => (
                    <Badge key={index} className="bg-neutral-100 text-gray-800 border-0 py-0.5 px-2">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar size={14} className="text-muted-foreground" />
                  Date & Time
                </label>
                <p className="text-gray-700">{fir.dateTime || 'Not specified'}</p>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin size={14} className="text-muted-foreground" />
                  Location
                </label>
                <p className="text-gray-700">{fir.location || 'Not specified'}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Incident Summary</label>
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-gray-700">
                {fir.summary}
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="px-5 py-4 bg-neutral-50 border-t rounded-b-xl">
          <Button 
            onClick={handleDownloadPDF}
            className="bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2"
          >
            <Download size={16} />
            Download FIR PDF
          </Button>
          <Button
            variant="outline"
            className="ml-auto"
            onClick={() => toast({
              title: "Share Link",
              description: "Link copying functionality coming soon",
              duration: 3000,
            })}
          >
            <ExternalLink size={16} className="mr-2" />
            Share
          </Button>
        </CardFooter>
      </Card>
      
      {/* Case Tracking Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mr-3">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Case Timeline</CardTitle>
              <CardDescription>Track investigation progress and status updates</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-5 py-4">
          <div className="relative pl-2 py-2">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/30 via-primary/10 to-gray-100"></div>
            
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
        </CardContent>
        
        <CardFooter className="px-5 py-4 bg-neutral-50 border-t rounded-b-xl flex flex-col items-start">
          <div className="w-full p-4 rounded-lg border border-neutral-100 mb-4">
            <h4 className="font-medium mb-2 flex items-center">
              <Phone size={16} className="text-primary mr-2" />
              Have questions about your case?
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Contact the investigating officer for updates or to provide additional information about your case.
            </p>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/5"
              onClick={handleContactOfficer}
            >
              Contact Investigating Officer
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground w-full">
            Next status update expected within 48 hours
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FIRStatusPanel;

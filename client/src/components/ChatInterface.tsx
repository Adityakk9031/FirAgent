import React, { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { processCrimeDescription } from '@/services/gemini';
import { createFir } from '@/services/api';
import { GeminiResponse, Message } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, RefreshCw, FileText, Sparkles, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInterfaceProps {
  onFirCreated: (firId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onFirCreated }) => {
  const [userInput, setUserInput] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nanoid(),
      content: `Welcome to the FIR Registration System. Please describe the incident you'd like to report in detail, including:
      • Type of crime (theft, assault, etc.)
      • When it happened (date and time)
      • Where it happened (location)
      • Who was involved (victim/suspect details)
      • Any evidence or witnesses`,
      role: 'system',
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<GeminiResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update character count when user input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    setCharCount(e.target.value.length);
  };

  // Clear the input field
  const handleClear = () => {
    setUserInput('');
    setCharCount(0);
  };

  // Process user input and generate FIR
  const handleSend = async () => {
    if (!userInput.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: nanoid(),
      content: userInput,
      role: 'user',
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input field
    setUserInput('');
    setCharCount(0);

    // Show processing message
    const processingId = nanoid();
    setMessages(prev => [...prev, {
      id: processingId,
      content: "I'm processing your input to extract relevant details for the FIR...",
      role: 'system',
    }]);

    setIsProcessing(true);

    try {
      // Process with Gemini
      const response = await processCrimeDescription(userMessage.content);
      setGeminiResponse(response);

      // Update processing message with the response
      setMessages(prev => prev.map(msg => 
        msg.id === processingId 
          ? {
              ...msg, 
              content: "I've analyzed your report and extracted the following information:",
            } 
          : msg
      ));

      // Add JSON response
      setMessages(prev => [...prev, {
        id: nanoid(),
        content: JSON.stringify(response, null, 2),
        role: 'system',
        type: 'json',
      }]);

      // Add final message
      setMessages(prev => [...prev, {
        id: nanoid(),
        content: `I've registered this as ${response.crime} under ${response.ipcSections.join(', ')}. Would you like to provide any additional details or proceed with generating the FIR?`,
        role: 'system',
      }]);

    } catch (error) {
      // Handle error
      console.error("Error processing with Gemini:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === processingId 
          ? {
              ...msg, 
              content: "Sorry, I encountered an error while processing your input. Please try again.",
            } 
          : msg
      ));

      toast({
        title: "Processing Error",
        description: "Failed to process your input. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate FIR when user confirms
  const handleGenerateFIR = async () => {
    if (!geminiResponse) return;

    setIsProcessing(true);
    
    try {
      // Use date and location from Gemini extraction if available
      const fir = await createFir({
        firId: geminiResponse.firId!,
        crime: geminiResponse.crime,
        ipcSections: geminiResponse.ipcSections,
        summary: geminiResponse.summary,
        priority: geminiResponse.priority,
        dateTime: geminiResponse.dateTime || 'Unknown',
        location: geminiResponse.location || 'Unknown',
        status: "REGISTERED"
      });

      // Add success message
      setMessages(prev => [...prev, {
        id: nanoid(),
        content: `I've generated your FIR with ID **${fir.firId}**. You can view the details and download the PDF from the FIR Status panel.`,
        role: 'system',
      }]);

      // Reset Gemini response
      setGeminiResponse(null);

      // Notify parent component
      onFirCreated(fir.firId);

      toast({
        title: "FIR Generated",
        description: `Your FIR has been generated with ID: ${fir.firId}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error creating FIR:", error);

      toast({
        title: "FIR Generation Error",
        description: "Failed to generate FIR. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-full border-none shadow-lg">
      <CardHeader className="px-5 py-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">AI-Powered FIR Assistant</CardTitle>
              <CardDescription>Describe the incident in natural language</CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-white">
                  <Sparkles className="h-3 w-3 mr-1 text-primary" />
                  Gemini AI
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Powered by Google's Gemini AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <div className="flex-grow px-5 py-4 overflow-y-auto" style={{ height: "400px", scrollbarWidth: 'thin' }}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-4 ${message.role === 'user' ? 'ml-auto text-right' : 'mr-auto'}`}
          >
            <div className={`inline-block max-w-[85%] px-4 py-3 rounded-xl shadow-sm
              ${message.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : message.type === 'json'
                  ? 'bg-neutral-50 text-left font-mono text-xs p-3 rounded-tl-none border'
                  : 'bg-white text-left rounded-tl-none border'
              }`}
            >
              {message.role === 'system' && message.type !== 'json' && (
                <div className="flex items-center mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-1.5">
                    <MessageSquare className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-medium text-sm">FIR Assistant</span>
                </div>
              )}
              <div className={`${message.type === 'json' ? 'whitespace-pre overflow-x-auto' : ''} ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                {message.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {/* Generate FIR button (only show when Gemini has responded) */}
        {geminiResponse && !isProcessing && (
          <div className="flex justify-center mt-6 mb-2">
            <Button 
              onClick={handleGenerateFIR}
              className="bg-primary hover:bg-primary/90 text-white shadow-md flex items-center gap-2 px-4 py-2"
            >
              <FileText className="h-4 w-4" />
              Generate Official FIR
            </Button>
          </div>
        )}
      </div>
      
      <CardFooter className="p-5 bg-neutral-50 rounded-b-xl border-t">
        <div className="w-full space-y-3">
          <Textarea
            id="messageInput"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the incident in detail (press Ctrl+Enter to send)..."
            rows={3}
            className="w-full resize-none border border-neutral-200 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary bg-white shadow-sm"
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground">{charCount} characters</span>
              {charCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="ml-2 text-xs flex items-center text-amber-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Please include date, time & location
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs max-w-xs">For better results, include specific date, time, and location details in your description</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClear}
                disabled={isProcessing || !userInput.trim()}
                size="sm"
                className="border-neutral-200"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button 
                onClick={handleSend}
                disabled={isProcessing || !userInput.trim()}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 shadow-sm"
              >
                {isProcessing ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isProcessing ? "Processing..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;

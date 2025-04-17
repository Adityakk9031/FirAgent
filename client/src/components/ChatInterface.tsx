import React, { useState, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { processCrimeDescription } from '@/services/gemini';
import { createFir } from '@/services/api';
import { GeminiResponse, Message } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
    <Card className="flex flex-col h-full">
      <CardHeader className="px-4 py-4 border-b">
        <CardTitle className="text-lg font-medium flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square mr-2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Conversational FIR Assistant
        </CardTitle>
        <CardDescription>Describe the incident in detail to generate an FIR</CardDescription>
      </CardHeader>
      
      <div className="flex-grow p-4 overflow-y-auto" style={{ height: "400px" }}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`chat-message max-w-[80%] mb-2.5 p-3 rounded-2xl ${
              message.role === 'user' 
                ? 'user-message bg-blue-50 border-top-right-radius-sm ml-auto' 
                : message.type === 'json'
                  ? 'system-message json bg-gray-50 border-top-left-radius-sm mr-auto font-mono text-sm'
                  : 'system-message bg-white border-top-left-radius-sm mr-auto'
            }`}
          >
            {message.role === 'system' && message.type !== 'json' && (
              <div className="font-bold">FIR Assistant</div>
            )}
            <div className={message.type === 'json' ? 'whitespace-pre' : ''}>
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {/* Generate FIR button (only show when Gemini has responded) */}
        {geminiResponse && !isProcessing && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={handleGenerateFIR}
              className="bg-primary text-white"
            >
              Generate FIR
            </Button>
          </div>
        )}
      </div>
      
      <CardContent className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            id="messageInput"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe the incident in detail..."
            rows={3}
            className="flex-grow border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs text-muted-foreground">{charCount} characters</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={isProcessing}
            >
              Clear
            </Button>
            <Button 
              className="bg-primary text-white hover:bg-primary/90 flex items-center"
              onClick={handleSend}
              disabled={isProcessing || !userInput.trim()}
            >
              {isProcessing ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send mr-1">
                  <path d="m22 2-7 20-4-9-9-4Z"/>
                  <path d="M22 2 11 13"/>
                </svg>
              )}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatInterface;

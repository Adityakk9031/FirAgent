import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askAILawyer } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, HelpCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Example questions for users to get started
const EXAMPLE_QUESTIONS = [
  "What should I do after filing a kidnapping FIR?",
  "What are my rights as a victim of cybercrime?",
  "How can I file a complaint against police inaction?",
  "What is the punishment for domestic violence in India?"
];

export function AILawyer() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ answer: string; question: string } | null>(null);
  const { toast } = useToast();

  const askLawyerMutation = useMutation({
    mutationFn: askAILawyer,
    onSuccess: (data) => {
      setAnswer(data);
      toast({
        title: "AI Lawyer Response",
        description: "Your legal question has been answered.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to get an answer from the AI Lawyer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    askLawyerMutation.mutate(question);
  };

  const handleExampleClick = (exampleQuestion: string) => {
    setQuestion(exampleQuestion);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <HelpCircle className="mr-2 h-5 w-5 text-primary" />
          AI Legal Assistant
        </CardTitle>
        <CardDescription>
          Get helpful legal information and guidance based on Indian law.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Ask a legal question (e.g., 'What should I do after filing a kidnapping FIR?')"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={askLawyerMutation.isPending}
              className="h-12 text-base"
            />
          </div>
          <Button type="submit" disabled={askLawyerMutation.isPending || !question.trim()} className="w-full">
            {askLawyerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consulting AI Lawyer...
              </>
            ) : (
              <>
                Ask AI Lawyer
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Example questions */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Try asking about:</h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((example, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => handleExampleClick(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        {answer && (
          <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
            <h3 className="font-medium mb-2">Your Question:</h3>
            <p className="mb-4 text-muted-foreground">{answer.question}</p>
            <h3 className="font-medium mb-2">AI Lawyer's Answer:</h3>
            <div className="whitespace-pre-line text-foreground">{answer.answer}</div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>Note: This AI provides general legal information only and should not be considered as legal advice.</p>
        <p className="mt-2">For specific legal advice, please consult with a qualified legal professional.</p>
      </CardFooter>
    </Card>
  );
} 
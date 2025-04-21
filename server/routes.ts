import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { SearchParams } from "./storage";
import { insertFirSchema, insertStatusUpdateSchema, insertEvidenceSchema, geminiResponseSchema } from "@shared/schema";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { format } from "date-fns";
import { generateFirId } from "../shared/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { setupAuth, ensureAuthenticated, ensureRole } from "./auth";
import { searchParamsValidator, createFirValidator, createStatusUpdateValidator, createEvidenceValidator } from "@shared/validators";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Genini AI client
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyAPK43L_7NY5cIHHqoq9S1HdHY3xtgrZjM");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Get all FIRs
  app.get('/api/firs', async (req: Request, res: Response) => {
    try {
      const firs = await storage.getAllFirs();
      res.json(firs);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve FIRs" });
    }
  });

  // Get a specific FIR by ID
  app.get('/api/firs/:firId', async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const fir = await storage.getFir(firId);
      
      if (!fir) {
        return res.status(404).json({ message: "FIR not found" });
      }
      
      res.json(fir);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve FIR" });
    }
  });

  // Create a new FIR
  app.post('/api/firs', async (req: Request, res: Response) => {
    try {
      const parsedBody = insertFirSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid FIR data", errors: parsedBody.error.format() });
      }
      
      const fir = await storage.createFir(parsedBody.data);
      res.status(201).json(fir);
    } catch (error) {
      res.status(500).json({ message: "Failed to create FIR" });
    }
  });

  // Update FIR status
  app.patch('/api/firs/:firId/status', async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedFir = await storage.updateFirStatus(firId, status);
      
      if (!updatedFir) {
        return res.status(404).json({ message: "FIR not found" });
      }
      
      res.json(updatedFir);
    } catch (error) {
      res.status(500).json({ message: "Failed to update FIR status" });
    }
  });

  // Get status updates for an FIR
  app.get('/api/firs/:firId/status-updates', async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const statusUpdates = await storage.getStatusUpdates(firId);
      res.json(statusUpdates);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve status updates" });
    }
  });

  // Create a status update for an FIR
  app.post('/api/firs/:firId/status-updates', async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const data = { ...req.body, firId };
      
      const parsedBody = insertStatusUpdateSchema.safeParse(data);
      
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid status update data", errors: parsedBody.error.format() });
      }
      
      const fir = await storage.getFir(firId);
      if (!fir) {
        return res.status(404).json({ message: "FIR not found" });
      }
      
      const statusUpdate = await storage.createStatusUpdate(parsedBody.data);
      
      // Update the FIR status as well
      await storage.updateFirStatus(firId, parsedBody.data.status);
      
      res.status(201).json(statusUpdate);
    } catch (error) {
      res.status(500).json({ message: "Failed to create status update" });
    }
  });

  // Generate PDF for an FIR
  app.get('/api/firs/:firId/pdf', async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const fir = await storage.getFir(firId);
      
      if (!fir) {
        return res.status(404).json({ message: "FIR not found" });
      }
      
      const pdfBytes = await generateFIRPDF(fir);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${firId}.pdf`);
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Search FIRs with filters and pagination
  app.get('/api/firs/search', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const searchParams = searchParamsValidator.parse(req.query);
      const result = await storage.searchFirs(searchParams as SearchParams);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid search parameters", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to search FIRs" });
    }
  });

  // Get FIRs by user (for civilians to see their own reports)
  app.get('/api/firs/user/:userId', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      
      // Only allow users to see their own FIRs unless they're an officer/admin
      if (req.user?.id !== userId && req.user?.role !== 'officer' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const firs = await storage.getFirsByUser(userId);
      res.json(firs);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve user FIRs" });
    }
  });

  // Get FIRs assigned to an officer
  app.get('/api/firs/officer/:officerId', ensureRole(['officer', 'admin']), async (req: Request, res: Response) => {
    try {
      const officerId = parseInt(req.params.officerId, 10);
      
      // Officers can only see their own assigned FIRs unless they're admins
      if (req.user?.id !== officerId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const firs = await storage.getFirsByOfficer(officerId);
      res.json(firs);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve officer FIRs" });
    }
  });

  // Update a FIR (partial update)
  app.patch('/api/firs/:firId', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const fir = await storage.getFir(firId);
      
      if (!fir) {
        return res.status(404).json({ message: "FIR not found" });
      }
      
      // Only allow the creator, assigned officer, or admins to update the FIR
      if (fir.userId !== req.user?.id && fir.officerId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedFir = await storage.updateFir(firId, req.body);
      res.json(updatedFir);
    } catch (error) {
      res.status(500).json({ message: "Failed to update FIR" });
    }
  });

  // Evidence routes
  // Upload evidence for a FIR (simplified - actual file upload would need additional handling)
  app.post('/api/firs/:firId/evidence', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const fir = await storage.getFir(firId);
      
      if (!fir) {
        return res.status(404).json({ message: "FIR not found" });
      }
      
      // This is a simplified version without actual file upload
      // In a real implementation, you would handle multipart/form-data
      const evidence = await storage.createEvidence({
        ...req.body,
        firId,
        uploadedBy: req.user?.id,
      });
      
      res.status(201).json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload evidence" });
    }
  });

  // Get evidence for a FIR
  app.get('/api/firs/:firId/evidence', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const { firId } = req.params;
      const evidence = await storage.getEvidenceByFir(firId);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve evidence" });
    }
  });

  // Notifications routes
  // Get user notifications
  app.get('/api/notifications', ensureAuthenticated, (async (req: Request, res: Response) => {
    try {
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getUserNotifications(req.user!.id, unreadOnly);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve notifications" });
    }
  }) as RequestHandler);

  // Mark notification as read
  app.post('/api/notifications/:id/read', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.markNotificationAsRead(id);
      res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', ensureAuthenticated, (async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  }) as RequestHandler);

  // Analytics routes (protected for authorized users only)
  // Get crime type distribution
  app.get('/api/analytics/crime-distribution', ensureRole(['officer', 'admin']), async (req: Request, res: Response) => {
    try {
      const distribution = await storage.getCrimeTypeDistribution();
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve crime distribution" });
    }
  });

  // Get status distribution
  app.get('/api/analytics/status-distribution', ensureRole(['officer', 'admin']), async (req: Request, res: Response) => {
    try {
      const distribution = await storage.getStatusDistribution();
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve status distribution" });
    }
  });

  // Get priority distribution
  app.get('/api/analytics/priority-distribution', ensureRole(['officer', 'admin']), async (req: Request, res: Response) => {
    try {
      const distribution = await storage.getPriorityDistribution();
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve priority distribution" });
    }
  });

  // Get monthly stats for a year
  app.get('/api/analytics/monthly-stats/:year', ensureRole(['officer', 'admin']), async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.params.year, 10);
      const stats = await storage.getMonthlyStats(year);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve monthly stats" });
    }
  });

  // Get analytics for a specific time range
  app.get('/api/analytics/time-range', ensureRole(['officer', 'admin']), async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const analytics = await storage.getAnalyticsByTimeRange(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve time range analytics" });
    }
  });

  // Process user input with Gemini
  app.post('/api/gemini/process', async (req: Request, res: Response) => {
    try {
      const { userInput } = req.body;
      
      if (!userInput || typeof userInput !== 'string') {
        return res.status(400).json({ message: "User input is required" });
      }
      
      // Build the prompt for Gemini
      const promptTemplate = `
      Act as an FIR assistant. Extract these details from user input:
      1. Crime type (e.g., theft, assault)
      2. Date/time (ISO format)
      3. Location (GPS preferred)
      4. Victim/perpetrator details
      5. Evidence mentions

      Respond ONLY in JSON format:
      {
        "crime": string,
        "ipcSections": string[] (e.g., ["IPC 379"]),
        "summary": string,
        "priority": 1-5,
        "dateTime": string (extracted date and time, or leave blank if uncertain),
        "location": string (extracted location, or leave blank if uncertain)
      }`;
      
      const prompt = `${promptTemplate}\n\nUser input: ${userInput}`;
      
      // Make request to Gemini API with retry logic
      let response;
      let attempts = 0;
      let maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          
          // Extract the JSON object from the response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (!jsonMatch) {
            if (attempts >= maxAttempts) {
              return res.status(500).json({ message: "Failed to parse Gemini response after multiple attempts" });
            }
            // Try again
            continue;
          }
          
          const jsonStr = jsonMatch[0];
          const parsedResponse = JSON.parse(jsonStr);
          
          // Validate the response
          const validatedResponse = geminiResponseSchema.parse(parsedResponse);
          response = validatedResponse;
          break;
        } catch (error) {
          if (attempts >= maxAttempts) {
            return res.status(500).json({ message: "Failed to process with Gemini after multiple attempts" });
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Generate a unique FIR ID
      const firId = generateFirId();
      
      res.json({
        ...response,
        firId,
      });
    } catch (error) {
      console.error("Gemini processing error:", error);
      res.status(500).json({ message: "Failed to process with Gemini" });
    }
  });

  // AI Lawyer service - Answer legal questions
  app.post('/api/ai-lawyer/ask', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ message: "A legal question is required" });
      }
      
      // Build the prompt for Gemini
      const promptTemplate = `
      Act as a helpful AI legal assistant specializing in Indian law. 
      
      Provide clear, direct, and informative answers to legal questions.
      Do NOT start your response with "YES" or "NO" unless specifically asked for a yes/no answer.
      
      Structure your response in a user-friendly way:
      1. Give a direct answer to the question
      2. Provide a brief explanation of the relevant legal principles
      3. Suggest practical next steps or actions the user can take
      
      Keep your response concise, practical, and focused on helping the user understand their legal situation.
      Use simple language and avoid excessive legal jargon.
      `;
      
      const prompt = `${promptTemplate}\n\nQuestion: ${question}`;
      
      // Make request to Gemini API with retry logic
      let response;
      let attempts = 0;
      let maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          
          response = {
            answer: responseText,
            question: question
          };
          
          break;
        } catch (error) {
          if (attempts >= maxAttempts) {
            return res.status(500).json({ message: "Failed to process with AI Lawyer after multiple attempts" });
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      res.json(response);
    } catch (error) {
      console.error("AI Lawyer processing error:", error);
      res.status(500).json({ message: "Failed to process with AI Lawyer" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate PDF
async function generateFIRPDF(fir: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Define coordinates and settings
  const margin = 50;
  let y = page.getHeight() - margin;
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  
  // Add header
  page.drawText('FIRST INFORMATION REPORT (FIR)', {
    x: margin,
    y,
    size: 18,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight * 2;
  
  // Add FIR ID
  page.drawText(`FIR ID: ${fir.firId}`, {
    x: margin,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight;
  
  // Add date
  const formattedDate = fir.createdAt ? format(new Date(fir.createdAt), 'PPP') : format(new Date(), 'PPP');
  page.drawText(`Date: ${formattedDate}`, {
    x: margin,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight * 2;
  
  // Add crime type
  page.drawText('Crime Type:', {
    x: margin,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight;
  
  page.drawText(fir.crime, {
    x: margin + 10,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight * 1.5;
  
  // Add IPC Sections
  page.drawText('IPC Sections:', {
    x: margin,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight;
  
  page.drawText(fir.ipcSections.join(', '), {
    x: margin + 10,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight * 1.5;
  
  // Add date and time of incident
  if (fir.dateTime) {
    page.drawText('Date and Time of Incident:', {
      x: margin,
      y,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight;
    
    page.drawText(fir.dateTime, {
      x: margin + 10,
      y,
      size: fontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight * 1.5;
  }
  
  // Add location
  if (fir.location) {
    page.drawText('Location:', {
      x: margin,
      y,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight;
    
    page.drawText(fir.location, {
      x: margin + 10,
      y,
      size: fontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight * 1.5;
  }
  
  // Add summary
  page.drawText('Summary:', {
    x: margin,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight;
  
  // Handle multi-line summary
  const words = fir.summary.split(' ');
  let currentLine = '';
  const maxWidth = page.getWidth() - (margin * 2);
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize);
    
    if (textWidth > maxWidth) {
      page.drawText(currentLine, {
        x: margin + 10,
        y,
        size: fontSize,
        font: helvetica,
        color: rgb(0, 0, 0),
      });
      currentLine = word;
      y -= lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    page.drawText(currentLine, {
      x: margin + 10,
      y,
      size: fontSize,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
  }
  
  y -= lineHeight * 2;
  
  // Add status
  page.drawText('Current Status:', {
    x: margin,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight;
  
  page.drawText(fir.status, {
    x: margin + 10,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight * 3;
  
  // Add signature lines
  page.drawText('______________________', {
    x: margin,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('______________________', {
    x: page.getWidth() - margin - 150,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  y -= lineHeight;
  
  page.drawText('Complainant Signature', {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('Officer Signature', {
    x: page.getWidth() - margin - 150,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });
  
  // Add footer
  y = margin;
  page.drawText('This is an official document. Tampering with this document is a punishable offense.', {
    x: margin,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  return await pdfDoc.save();
}

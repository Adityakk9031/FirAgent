import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI (Gemini)
// This would be used on the frontend for realtime interactions if needed
// The actual API calls are routed through the backend for security
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAPK43L_7NY5cIHHqoq9S1HdHY3xtgrZjM");

createRoot(document.getElementById("root")!).render(<App />);

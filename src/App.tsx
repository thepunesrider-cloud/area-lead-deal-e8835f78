import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { checkExpiredLeads } from "@/lib/auto-rejection";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import GenerateLead from "./pages/GenerateLead";
import GetLeads from "./pages/GetLeads";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Subscribe from "./pages/Subscribe";
import Community from "./pages/Community";
import Notifications from "./pages/Notifications";
import LeadDetails from "./pages/LeadDetails";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

const AppContent = () => {
  // Check for expired leads on app load
  useEffect(() => {
    const checkLeads = async () => {
      const count = await checkExpiredLeads();
      if (count > 0) {
        console.log(`Auto-rejected ${count} expired leads`);
      }
    };
    
    checkLeads();

    // Check every hour
    const interval = setInterval(checkLeads, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/generate-lead" element={<GenerateLead />} />
        <Route path="/get-leads" element={<GetLeads />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/community" element={<Community />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/lead/:id" element={<LeadDetails />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

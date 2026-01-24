import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="bg-card rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Effective Date: 1 January 2026</p>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg mb-6">
              Welcome to Leads Nearby. These Terms of Service ("Terms") govern your access to and use of our platform, services, and website (collectively, the "Platform").
            </p>
            
            <p className="mb-6">
              By using Leads Nearby, you agree to be bound by these Terms. If you do not agree, please do not use our Platform.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">
              By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>You must be at least 18 years old to use this Platform</li>
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <p className="mb-2">You agree to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Use the Platform only for lawful purposes</li>
              <li>Provide accurate and truthful information</li>
              <li>Not impersonate others or misrepresent your identity</li>
              <li>Not engage in fraudulent, abusive, or harmful activities</li>
              <li>Respect the intellectual property rights of others</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">4. Services</h2>
            <p className="mb-4">
              Leads Nearby provides a platform connecting service providers with potential customers in their area. We facilitate lead generation and communication but are not party to any transactions between users.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">5. Payments & Subscriptions</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Subscription fees are charged in advance and are non-refundable</li>
              <li>You authorize us to charge your payment method for recurring subscriptions</li>
              <li>You can cancel your subscription at any time</li>
              <li>We reserve the right to change pricing with advance notice</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">6. Limitation of Liability</h2>
            <p className="mb-4">
              Leads Nearby is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Platform, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
            <p className="mb-4">
              We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our sole discretion.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">8. Modifications</h2>
            <p className="mb-4">
              We may modify these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the modified Terms.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <div className="bg-muted p-4 rounded-lg mb-6">
              <p className="font-semibold mb-2">Leads Nearby – Powered by Bisugen Technologies</p>
              <p>📧 Email: support@leadsnearby.com</p>
              <p>📞 Phone: +91 9309282749</p>
              <p>🌐 Website: www.leadsnearby.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

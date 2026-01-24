import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Effective Date: 1 January 2026</p>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg mb-6">
              Welcome to Leads Nearby. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our website, mobile application, and services (collectively, the "Platform").
            </p>
            
            <p className="mb-6">
              Leads Nearby is powered by Bisugen Technologies. By accessing or using the Platform, you agree to the terms of this Privacy Policy.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">We collect information to provide better services to all our users.</p>

            <h3 className="text-xl font-semibold mb-3">1.1 Personal Information</h3>
            <p className="mb-2">When you register or use our services, we may collect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Full Name</li>
              <li>Mobile Number</li>
              <li>Email Address</li>
              <li>Location (City, Area, GPS-based location if enabled)</li>
              <li>Service category and business details</li>
              <li>Profile photo and proof of work (uploaded by you)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">1.2 Usage & Technical Information</h3>
            <p className="mb-2">We automatically collect:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Device information (device type, OS, browser)</li>
              <li>IP address</li>
              <li>App usage data (pages viewed, actions taken)</li>
              <li>Date and time of access</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3">1.3 Payment Information</h3>
            <p className="mb-4">
              For paid plans, payments are processed via secure third-party payment gateways. 
              💳 We do not store your card or banking details.
            </p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Create and manage user accounts</li>
              <li>Match service providers with nearby leads</li>
              <li>Send real-time notifications and alerts</li>
              <li>Improve platform performance and user experience</li>
              <li>Provide customer support</li>
              <li>Process payments and subscriptions</li>
              <li>Prevent fraud, abuse, or misuse</li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">3. Location Data Usage</h2>
            <p className="mb-2">Location data is a core feature of Leads Nearby.</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Used only to match leads and service providers within a selected radius</li>
              <li>You can enable or disable location access from your device settings</li>
              <li>Location data is never sold or misused</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing & Disclosure</h2>
            <p className="mb-4">We do not sell or rent your personal data.</p>
            <p className="mb-2">We may share information only with:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Other users (limited and relevant details for lead connection)</li>
              <li>Trusted third-party service providers (hosting, analytics, payment processing)</li>
              <li>Government or legal authorities when required by law</li>
            </ul>
            <p className="mb-4">All third parties are bound by confidentiality and data protection obligations.</p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="mb-2">We take data security seriously and implement:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Secure servers and encrypted connections (HTTPS)</li>
              <li>Role-based access control</li>
              <li>Regular security audits</li>
              <li>Enterprise-grade data protection practices</li>
            </ul>
            <p className="mb-4">Despite best efforts, no system is 100% secure. Users are encouraged to protect their login credentials.</p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>We retain your data as long as your account is active</li>
              <li>You may request deletion of your account and personal data</li>
              <li>Some data may be retained for legal, audit, or compliance purposes</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Access your personal data</li>
              <li>Update or correct your information</li>
              <li>Request account deletion</li>
              <li>Withdraw consent for marketing communications</li>
            </ul>
            <p className="mb-4">To exercise these rights, contact us at support@leadsnearby.com</p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">8. Cookies & Tracking Technologies</h2>
            <p className="mb-2">We use cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Maintain sessions</li>
              <li>Analyze traffic and usage trends</li>
              <li>Improve performance and user experience</li>
            </ul>
            <p className="mb-4">You can control cookies through your browser settings.</p>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Leads Nearby is not intended for users under 18 years of age.</li>
              <li>We do not knowingly collect personal data from minors.</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">10. Third-Party Links</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Our Platform may contain links to third-party websites.</li>
              <li>We are not responsible for the privacy practices of those websites.</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Privacy Policy</h2>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>We may update this Privacy Policy from time to time.</li>
              <li>Any changes will be posted on this page with an updated effective date.</li>
              <li>Continued use of the Platform after changes implies acceptance of the revised policy.</li>
            </ul>

            <hr className="my-8" />

            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="mb-2">If you have any questions or concerns about this Privacy Policy, contact us:</p>
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

export default PrivacyPolicy;

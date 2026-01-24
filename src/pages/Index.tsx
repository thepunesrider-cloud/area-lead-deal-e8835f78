import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, MapPin, Bell, Users, Zap, Shield, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const Index: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-xl font-extrabold text-primary-foreground">LN</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              Leads <span className="text-primary">Nearby</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Bell size={16} />
              Get Leads in Your Area
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4 animate-slide-up leading-tight">
              Get Instant Alerts When a{' '}
              <span className="text-primary">Lead Comes Near You</span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Stop scrolling through WhatsApp groups. Get real leads from real customers in your area.
              <br/>
              <strong>One alert. One lead. One chance to win.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button variant="hero" size="lg" onClick={() => navigate('/auth')} className="gap-2">
                Start Getting Leads Now
                <ArrowRight size={20} />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              ✨ Free to join · 📍 Local leads only · ⚡ Instant alerts
            </p>
          </div>
        </div>
      </section>

      {/* Features Section - The Main Promise */}
      <section className="py-20 bg-gradient-to-b from-background to-accent/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Join Leads Nearby?
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Simple features. Real leads. Real business.
            </p>
          </div>

          {/* Main Feature - Get Alerts */}
          <div className="mb-16 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 md:p-12 border border-primary/20">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <Bell size={20} />
                  #1 Feature
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  Get a Notification When Someone Needs Your Help Nearby
                </h3>
                <p className="text-muted-foreground text-lg mb-6">
                  A customer looking for your service comes in your area? You get an instant alert on your phone. No waiting. No scrolling. Just real leads.
                </p>
                <ul className="space-y-3">
                  {[
                    '📱 Instant WhatsApp alert',
                    '📍 Only leads near your location',
                    '⚡ Click to claim in seconds',
                    '💬 Direct chat with customer'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-foreground font-medium">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card rounded-2xl p-8 border border-border">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-900">New Lead: Rent Agreement - 2km Away</span>
                  </div>
                  <div className="text-center text-2xl font-bold text-primary">
                    Tap to Claim Now
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    You're the first to see this lead
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <MapPin className="text-primary" size={28} />,
                title: 'Only Local Leads',
                description: 'Set your area. Get leads nearby. No wasting time on far away jobs.'
              },
              {
                icon: <Users className="text-secondary" size={28} />,
                title: 'Real People, Real Leads',
                description: 'No bots. No timepass. Only verified customers who need your help.'
              },
              {
                icon: <CheckCircle className="text-primary" size={28} />,
                title: 'Easy Proof',
                description: 'Upload photos of completed work. Build trust. Get more leads.'
              },
              {
                icon: <Shield className="text-secondary" size={28} />,
                title: 'Safe & Verified',
                description: 'All users are verified. Your data is safe. Trust the platform.'
              },
              {
                icon: <Zap className="text-primary" size={28} />,
                title: 'First Come, First Serve',
                description: 'Fast people earn more. Be quick. Claim the lead first.'
              },
              {
                icon: <Phone className="text-secondary" size={28} />,
                title: 'Direct Contact',
                description: 'Get customer phone number. Talk directly. No middleman.'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all hover:border-primary/50"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-accent/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works - 3 Simple Steps
            </h2>
            <p className="text-muted-foreground text-base">Start earning in minutes, not days</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Sign Up (2 minutes)',
                description: 'Download the app. Enter your phone number. Done!'
              },
              {
                step: '2',
                title: 'Set Your Location (1 minute)',
                description: 'Show where you work. How far can you travel? What service you offer?'
              },
              {
                step: '3',
                title: 'Get Alerts & Earn (Every day)',
                description: 'Get notified when a customer needs you. Accept. Meet. Earn. Repeat.'
              }
            ].map((step, idx) => (
              <div key={idx} className="relative text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {idx < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Posters Section */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              See What's Possible
            </h2>
            <p className="text-muted-foreground text-lg">Real stories. Real earnings.</p>
          </div>

          {/* Poster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Poster 1 - Rent Agreement Lead */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl overflow-hidden shadow-lg border-2 border-orange-200 h-80">
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">🏠</div>
                  <h3 className="text-2xl font-bold text-orange-900 mb-2">Rent Agreement Lead</h3>
                  <p className="text-orange-800">New business in your area, 2km away</p>
                </div>
              </div>
            </div>

            {/* Poster 2 - Service Provider Success */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl overflow-hidden shadow-lg border-2 border-green-200 h-80">
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">💰</div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">Earn Real Money</h3>
                  <p className="text-green-800">Complete work, get paid instantly</p>
                </div>
              </div>
            </div>

            {/* Poster 3 - Real Time Notification */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl overflow-hidden shadow-lg border-2 border-blue-200 h-80">
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">📱</div>
                  <h3 className="text-2xl font-bold text-blue-900 mb-2">Instant Alert</h3>
                  <p className="text-blue-800">Get notified the moment a lead comes</p>
                </div>
              </div>
            </div>

            {/* Poster 4 - No Timepass */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl overflow-hidden shadow-lg border-2 border-purple-200 h-80">
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-purple-900 mb-2">No Timepass</h3>
                  <p className="text-purple-800">Only real, verified leads - no fake messages</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-b from-background to-accent/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple Pricing. No Hidden Charges.
            </h2>
            <p className="text-muted-foreground text-lg">Start free. Upgrade anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-card border border-border rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-foreground mb-2">Free Plan</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">₹0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  '✓ View leads near you',
                  '✓ Get basic notifications',
                  '✓ Limited leads per day'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                Start Free
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Best Value
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Premium Plan</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">₹499</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  '✓ Get ALL leads in your area',
                  '✓ Instant WhatsApp alerts',
                  '✓ See customer phone number',
                  '✓ Accept unlimited leads',
                  '✓ Priority support'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-foreground font-medium">
                    {feature}
                  </li>
                ))}
              </ul>
              <Button variant="hero" className="w-full" onClick={() => navigate('/auth')}>
                Upgrade to Premium
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Auto-renews every 30 days. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Bisugen */}
      <section className="py-20 bg-accent/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Globe className="text-primary-foreground" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Powered by Bisugen Technologies</h2>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
            Bisugen Technologies is a leading software development company specializing in innovative digital solutions. 
            With expertise in mobile apps, web platforms, and enterprise software, we're committed to transforming 
            how businesses connect with their customers through cutting-edge technology.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-primary" />
              10+ Years Experience
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-primary" />
              500+ Projects Delivered
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-primary" />
              50+ Team Members
            </span>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Get in Touch
            </h2>
            <p className="text-muted-foreground text-lg">Have questions? We're here to help</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="text-primary" size={24} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Phone</h3>
              <p className="text-muted-foreground text-sm mb-2">Mon-Sat: 9AM - 6PM</p>
              <a href="tel:+919309282749" className="text-primary font-medium hover:underline">
                +91 9309282749
              </a>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="text-secondary" size={24} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Email</h3>
              <p className="text-muted-foreground text-sm mb-2">We reply within 24 hours</p>
              <a href="mailto:bisugentech@gmail.com" className="text-primary font-medium hover:underline">
                bisugentech@gmail.com
              </a>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="text-primary" size={24} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Website</h3>
              <p className="text-muted-foreground text-sm mb-2">Visit our company site</p>
              <a href="https://www.bisugentech.in" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                www.bisugentech.in
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of service providers and customers connecting every day on Leads Nearby
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate('/auth')} className="gap-2">
            Create Free Account
            <ArrowRight size={20} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">LN</span>
            </div>
            <span className="font-bold text-foreground">Leads Nearby</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            © 2026 Bisugen Technologies. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
            <a href="mailto:support@leadsnearby.com" className="hover:text-primary transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

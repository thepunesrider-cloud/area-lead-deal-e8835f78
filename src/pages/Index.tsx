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
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Zap size={16} />
              Powered by Bisugen Technologies
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 animate-slide-up">
              Connect with Local Service Leads in{' '}
              <span className="text-primary">Real-Time</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Leads Nearby connects people who need work done with nearby service providers who can instantly view, accept, and complete jobs around them.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button variant="hero" size="lg" onClick={() => navigate('/auth')} className="gap-2">
                Get Started Free
                <ArrowRight size={20} />
              </Button>
              <Button variant="outline" size="lg" onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                View Pricing
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              ✨ No credit card required · 🚀 Start in 2 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Grow Your Business
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed for both service providers and customers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MapPin className="text-primary" size={32} />,
                title: 'Location-Based Matching',
                description: 'Get matched with leads within your service radius automatically'
              },
              {
                icon: <Bell className="text-secondary" size={32} />,
                title: 'Real-Time Notifications',
                description: 'Never miss a lead with instant push notifications on new opportunities'
              },
              {
                icon: <Users className="text-primary" size={32} />,
                title: 'Verified Professionals',
                description: 'Connect with verified service providers and genuine customers'
              },
              {
                icon: <Zap className="text-secondary" size={32} />,
                title: 'Instant Lead Generation',
                description: 'Post your requirements and get responses within minutes'
              },
              {
                icon: <Shield className="text-primary" size={32} />,
                title: 'Secure Platform',
                description: 'Your data is protected with enterprise-grade security'
              },
              {
                icon: <CheckCircle className="text-secondary" size={32} />,
                title: 'Proof of Work',
                description: 'Upload completion proofs and build your reputation'
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all hover:border-primary/50"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-accent/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">Simple 3-step process to get started</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Sign Up',
                description: 'Create your free account in under 2 minutes with just your phone number'
              },
              {
                step: '2',
                title: 'Set Your Location',
                description: 'Define your service area and the types of services you offer or need'
              },
              {
                step: '3',
                title: 'Start Connecting',
                description: 'Post leads or accept opportunities. Get paid and build your reputation'
              }
            ].map((step, idx) => (
              <div key={idx} className="relative text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
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

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg">Choose the plan that works for you</p>
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
                  'Post unlimited leads',
                  'View limited lead details',
                  'Basic notifications',
                  'Community access'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-0.5" size={20} />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                Get Started Free
              </Button>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Premium Plan</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">₹500</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Free',
                  'View full lead details',
                  'Accept unlimited leads',
                  'Priority notifications',
                  'Advanced analytics',
                  'Premium support'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-0.5" size={20} />
                    <span className="text-foreground font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button variant="hero" className="w-full" onClick={() => navigate('/auth')}>
                Start Premium Trial
              </Button>
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

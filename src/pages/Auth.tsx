import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit phone number'),
});

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      if (isForgotPassword) {
        z.string().email().parse(email);
        setErrors({});
        return true;
      }
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, name, phone });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message,
      });
    } else {
      toast({
        title: t('success'),
        description: 'Password reset email sent! Check your inbox.',
      });
      setIsForgotPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: 'destructive',
            title: t('error'),
            description: error.message || 'Failed to sign in',
          });
        } else {
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, name, phone);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              variant: 'destructive',
              title: t('error'),
              description: 'This email is already registered. Please sign in.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: t('error'),
              description: error.message || 'Failed to sign up',
            });
          }
        } else {
          toast({
            title: t('success'),
            description: 'Account created! Please set up your profile.',
          });
          navigate('/onboarding');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div />
        <LanguageToggle />
      </div>

      {/* Logo Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="text-center mb-8 animate-slide-up">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow-primary">
            <span className="text-3xl font-extrabold text-primary-foreground">LX</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">LEADX</h1>
          <p className="text-muted-foreground mt-1">{t('tagline')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-fade-in">
          {isForgotPassword ? (
            <>
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
                <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-base rounded-xl bg-card border-border"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {!isLogin && (
                <>
                  <div className="space-y-1">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                      <Input
                        type="text"
                        placeholder={t('name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-12 h-14 text-base rounded-xl bg-card border-border"
                      />
                    </div>
                    {errors.name && <p className="text-destructive text-sm pl-2">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                      <Input
                        type="tel"
                        placeholder={t('phone')}
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhone(val);
                        }}
                        className="pl-12 h-14 text-base rounded-xl bg-card border-border"
                      />
                    </div>
                    {errors.phone && <p className="text-destructive text-sm pl-2">{errors.phone}</p>}
                  </div>
                </>
              )}

              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 text-base rounded-xl bg-card border-border"
                  />
                </div>
                {errors.email && <p className="text-destructive text-sm pl-2">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <Input
                    type="password"
                    placeholder={t('password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 text-base rounded-xl bg-card border-border"
                  />
                </div>
                {errors.password && <p className="text-destructive text-sm pl-2">{errors.password}</p>}
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="hero"
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <span>
                  {isForgotPassword ? 'Send Reset Link' : isLogin ? t('login') : t('signup')}
                </span>
                <ArrowRight size={20} />
              </>
            )}
          </Button>
        </form>

        {/* Links */}
        <div className="mt-6 space-y-3 text-center">
          {!isForgotPassword && isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-sm text-primary hover:underline"
            >
              Forgot Password?
            </button>
          )}
          
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>Don't have an account? <span className="text-primary font-semibold">{t('signup')}</span></>
              ) : (
                <>Already have an account? <span className="text-primary font-semibold">{t('login')}</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

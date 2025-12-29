import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'mr' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    mr: string;
    hi: string;
  };
}

const translations: Translations = {
  // App name & branding
  appName: { en: 'LEADX', mr: 'LEADX', hi: 'LEADX' },
  tagline: { en: 'Local Lead Exchange', mr: 'स्थानिक लीड एक्सचेंज', hi: 'लोकल लीड एक्सचेंज' },
  
  // Navigation
  home: { en: 'Home', mr: 'होम', hi: 'होम' },
  history: { en: 'History', mr: 'इतिहास', hi: 'इतिहास' },
  profile: { en: 'Profile', mr: 'प्रोफाइल', hi: 'प्रोफाइल' },
  
  // Auth
  login: { en: 'Login', mr: 'लॉगिन', hi: 'लॉगिन' },
  signup: { en: 'Sign Up', mr: 'साइन अप', hi: 'साइन अप' },
  logout: { en: 'Logout', mr: 'लॉगआउट', hi: 'लॉगआउट' },
  phone: { en: 'Phone Number', mr: 'फोन नंबर', hi: 'फ़ोन नंबर' },
  email: { en: 'Email', mr: 'ईमेल', hi: 'ईमेल' },
  password: { en: 'Password', mr: 'पासवर्ड', hi: 'पासवर्ड' },
  name: { en: 'Name', mr: 'नाव', hi: 'नाम' },
  continue: { en: 'Continue', mr: 'पुढे', hi: 'आगे' },
  
  // Dashboard
  generateLead: { en: 'Generate Lead', mr: 'लीड तयार करा', hi: 'लीड बनाएं' },
  getLeads: { en: 'Get Nearby Leads', mr: 'जवळील लीड मिळवा', hi: 'पास के लीड पाएं' },
  postJob: { en: 'Post a job request', mr: 'काम पोस्ट करा', hi: 'काम पोस्ट करें' },
  findWork: { en: 'Find work near you', mr: 'तुमच्या जवळ काम शोधा', hi: 'अपने पास काम खोजें' },
  
  // Lead Form
  serviceType: { en: 'Service Type', mr: 'सेवा प्रकार', hi: 'सेवा का प्रकार' },
  location: { en: 'Location', mr: 'स्थान', hi: 'स्थान' },
  customerPhone: { en: 'Customer Phone', mr: 'ग्राहक फोन', hi: 'ग्राहक फ़ोन' },
  customerName: { en: 'Customer Name', mr: 'ग्राहकाचे नाव', hi: 'ग्राहक का नाम' },
  notes: { en: 'Notes', mr: 'टिप्पणी', hi: 'नोट्स' },
  uploadPhoto: { en: 'Upload Photo', mr: 'फोटो अपलोड करा', hi: 'फोटो अपलोड करें' },
  submit: { en: 'Submit', mr: 'सबमिट करा', hi: 'सबमिट करें' },
  
  // Service Types
  rentAgreement: { en: 'Rent Agreement', mr: 'भाडे करार', hi: 'किराया करार' },
  domicile: { en: 'Domicile', mr: 'अधिवास', hi: 'अधिवास' },
  incomeCertificate: { en: 'Income Certificate', mr: 'उत्पन्न प्रमाणपत्र', hi: 'आय प्रमाण पत्र' },
  birthCertificate: { en: 'Birth Certificate', mr: 'जन्म प्रमाणपत्र', hi: 'जन्म प्रमाण पत्र' },
  deathCertificate: { en: 'Death Certificate', mr: 'मृत्यू प्रमाणपत्र', hi: 'मृत्यु प्रमाण पत्र' },
  other: { en: 'Other', mr: 'इतर', hi: 'अन्य' },
  
  // Leads List
  availableLeads: { en: 'Available Leads', mr: 'उपलब्ध लीड्स', hi: 'उपलब्ध लीड्स' },
  noLeads: { en: 'No leads available', mr: 'कोणतीही लीड उपलब्ध नाही', hi: 'कोई लीड उपलब्ध नहीं' },
  kmAway: { en: 'km away', mr: 'कि.मी. दूर', hi: 'कि.मी. दूर' },
  viewDetails: { en: 'View Details', mr: 'तपशील पहा', hi: 'विवरण देखें' },
  acceptLead: { en: 'Accept Lead', mr: 'लीड स्वीकारा', hi: 'लीड स्वीकारें' },
  leadTaken: { en: 'Lead Taken', mr: 'लीड घेतली', hi: 'लीड ली गई' },
  
  // Subscription
  subscribe: { en: 'Subscribe', mr: 'सदस्यता घ्या', hi: 'सदस्यता लें' },
  subscribeNow: { en: 'Subscribe Now', mr: 'आता सदस्यता घ्या', hi: 'अभी सदस्यता लें' },
  unlockLeads: { en: 'Unlock all leads', mr: 'सर्व लीड्स अनलॉक करा', hi: 'सभी लीड्स अनलॉक करें' },
  perMonth: { en: '/month', mr: '/महिना', hi: '/महीना' },
  freePlan: { en: 'Free Plan', mr: 'मोफत प्लॅन', hi: 'मुफ्त प्लान' },
  premiumPlan: { en: 'Premium Plan', mr: 'प्रीमियम प्लॅन', hi: 'प्रीमियम प्लान' },
  
  // Profile
  serviceRadius: { en: 'Service Radius', mr: 'सेवा त्रिज्या', hi: 'सेवा दायरा' },
  saveProfile: { en: 'Save Profile', mr: 'प्रोफाइल सेव्ह करा', hi: 'प्रोफाइल सेव करें' },
  setLocation: { en: 'Set Your Location', mr: 'तुमचे स्थान सेट करा', hi: 'अपना स्थान सेट करें' },
  
  // Onboarding
  welcome: { en: 'Welcome to LEADX', mr: 'LEADX मध्ये स्वागत', hi: 'LEADX में स्वागत' },
  setupProfile: { en: 'Set up your profile', mr: 'तुमची प्रोफाइल सेट करा', hi: 'अपनी प्रोफाइल सेट करें' },
  setupLocation: { en: 'Set your service area', mr: 'तुमचे सेवा क्षेत्र सेट करा', hi: 'अपना सेवा क्षेत्र सेट करें' },
  getStarted: { en: 'Get Started', mr: 'सुरू करा', hi: 'शुरू करें' },
  skip: { en: 'Skip', mr: 'वगळा', hi: 'छोड़ें' },
  
  // Alerts
  success: { en: 'Success!', mr: 'यश!', hi: 'सफलता!' },
  error: { en: 'Error', mr: 'त्रुटी', hi: 'त्रुटि' },
  leadCreated: { en: 'Lead created successfully', mr: 'लीड यशस्वीरित्या तयार झाली', hi: 'लीड सफलतापूर्वक बनाई गई' },
  leadAccepted: { en: 'Lead accepted!', mr: 'लीड स्वीकारली!', hi: 'लीड स्वीकार की गई!' },
  leadAlreadyTaken: { en: 'Sorry, someone just took this lead!', mr: 'क्षमस्व, कोणीतरी नुकतीच ही लीड घेतली!', hi: 'क्षमा करें, किसी ने अभी यह लीड ले ली!' },
  subscribeToView: { en: 'Subscribe to view full details', mr: 'पूर्ण तपशील पाहण्यासाठी सदस्यता घ्या', hi: 'पूर्ण विवरण देखने के लिए सदस्यता लें' },
  newLeadAlert: { en: 'New Lead available in your area!', mr: 'तुमच्या परिसरात नवीन लीड उपलब्ध!', hi: 'आपके क्षेत्र में नई लीड उपलब्ध!' },
  
  // Status
  open: { en: 'Open', mr: 'उघडा', hi: 'खुला' },
  claimed: { en: 'Claimed', mr: 'दावा केला', hi: 'दावा किया' },
  completed: { en: 'Completed', mr: 'पूर्ण', hi: 'पूर्ण' },
  cancelled: { en: 'Cancelled', mr: 'रद्द', hi: 'रद्द' },
  
  // Common
  loading: { en: 'Loading...', mr: 'लोड होत आहे...', hi: 'लोड हो रहा है...' },
  refresh: { en: 'Refresh', mr: 'रिफ्रेश', hi: 'रिफ्रेश' },
  cancel: { en: 'Cancel', mr: 'रद्द करा', hi: 'रद्द करें' },
  confirm: { en: 'Confirm', mr: 'पुष्टी करा', hi: 'पुष्टि करें' },
  back: { en: 'Back', mr: 'मागे', hi: 'पीछे' },
  next: { en: 'Next', mr: 'पुढे', hi: 'आगे' },
  save: { en: 'Save', mr: 'सेव्ह करा', hi: 'सेव करें' },
  close: { en: 'Close', mr: 'बंद करा', hi: 'बंद करें' },
  contact: { en: 'Contact', mr: 'संपर्क', hi: 'संपर्क' },
  call: { en: 'Call', mr: 'कॉल करा', hi: 'कॉल करें' },
  near: { en: 'Near', mr: 'जवळ', hi: 'पास' },
  ago: { en: 'ago', mr: 'पूर्वी', hi: 'पहले' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import { Link } from "wouter";
import { Map, ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <span className="font-bold">Easy Agra — Privacy Policy</span>
          </div>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6 prose prose-sm max-w-none">
        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-6">Last updated: June 19, 2026</p>
        {[
          { title: "Information We Collect", body: "We collect information you provide when registering (name, email, mobile, city) and information generated through your use of Easy Agra (activity logs, session data, notifications)." },
          { title: "How We Use Your Information", body: "Your information is used to provide and improve our services, process owner requests, send notifications, maintain platform security, and comply with legal obligations." },
          { title: "Data Security", body: "We use industry-standard encryption and security practices to protect your personal data. Passwords are hashed using bcrypt and never stored in plain text." },
          { title: "Data Sharing", body: "We do not sell or share your personal data with third parties except as required by law or to provide our services (e.g., hosting providers)." },
          { title: "Your Rights", body: "You have the right to access, update, or delete your account information at any time. Contact our support team for assistance." },
          { title: "Cookies", body: "We use session cookies to maintain your login state. These are essential for the platform to function and cannot be disabled." },
          { title: "Contact Us", body: "For privacy-related queries, contact us at privacy@easyagra.com or through our Contact page." },
        ].map(({ title, body }) => (
          <div key={title} className="mb-5">
            <h2 className="text-base font-bold mb-1.5">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

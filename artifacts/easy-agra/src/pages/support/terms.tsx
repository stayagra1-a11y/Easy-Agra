import { Link } from "wouter";
import { Map, ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <span className="font-bold">Easy Agra — Terms of Service</span>
          </div>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-6">Last updated: June 19, 2026</p>
        {[
          { title: "Acceptance of Terms", body: "By using Easy Agra, you agree to these terms. If you do not agree, please do not use the platform." },
          { title: "User Accounts", body: "You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information when registering. You must be at least 18 years old to use Easy Agra." },
          { title: "Owner Listings", body: "Business owners must provide accurate and truthful information about their businesses. Easy Agra reserves the right to remove listings that violate our policies or contain false information." },
          { title: "Prohibited Activities", body: "You must not: misuse the platform, create fake accounts, post false information, attempt to gain unauthorized access, or use the platform for illegal activities." },
          { title: "Termination", body: "We reserve the right to suspend or terminate accounts that violate these terms. You may also delete your account at any time through the Settings page." },
          { title: "Disclaimer", body: "Easy Agra is provided 'as is' without warranties of any kind. We are not responsible for the accuracy of business listings or the quality of services provided by owners." },
          { title: "Governing Law", body: "These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Agra, Uttar Pradesh." },
          { title: "Changes to Terms", body: "We may update these terms from time to time. Continued use of Easy Agra after changes constitutes acceptance of the new terms." },
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

import { Link } from "wouter";
import { Map, ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  { q: "How do I become a hotel/restaurant/spa owner?", a: "Go to your profile and click 'Become an Owner'. Select the type of business and fill in the details. Our team will review your request and get back to you within 2-3 business days." },
  { q: "How long does owner approval take?", a: "Owner requests are typically reviewed within 2-3 business days. You'll receive a notification once your request is approved or rejected." },
  { q: "Can I change my email address?", a: "Currently, email changes require contacting our support team. Please reach out via the Contact page." },
  { q: "How do I reset my password?", a: "Go to the Login page and click 'Forgot password?'. Enter your email address and we'll send you a reset link." },
  { q: "What happens if my account is suspended?", a: "If your account is suspended, you won't be able to log in. Please contact our support team for assistance." },
  { q: "Is Easy Agra available outside Agra?", a: "Currently Easy Agra focuses exclusively on Agra. We plan to expand to other cities in upcoming releases." },
];

export default function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <span className="font-bold">Easy Agra — Help</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-muted-foreground mt-1">Frequently asked questions</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`} />
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm mb-3">Still need help?</p>
          <Link href="/contact">
            <button className="text-primary font-semibold text-sm hover:underline">Contact Support →</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

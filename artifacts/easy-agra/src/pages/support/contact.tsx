import { useState } from "react";
import { Link } from "wouter";
import { Map, Mail, Phone, MapPin, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-accent" />
            <span className="font-bold">Easy Agra — Contact Us</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Get in Touch</h1>
          <p className="text-muted-foreground mt-1">Have a question? We'd love to hear from you.</p>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: Mail, label: "Email", value: "support@easyagra.com" },
            { icon: Phone, label: "Phone", value: "+91 562-123-4567" },
            { icon: MapPin, label: "Address", value: "Taj Nagri, Agra, UP 282001" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 bg-muted/40 rounded-xl p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input placeholder="How can we help?" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea placeholder="Describe your issue or question..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required rows={4} />
          </div>
          <Button type="submit" className="w-full bg-primary" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}

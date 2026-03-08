import SiteHeader from "@/components/site/SiteHeader";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: 8 March 2026</p>
      </div>
      <div className="prose prose-lg max-w-none space-y-8">
        <section><h2 className="text-2xl font-bold mb-4">Introduction</h2><p className="text-muted-foreground">NextSlot ("we", "us", or "our") is committed to protecting your personal information in accordance with the Protection of Personal Information Act 4 of 2013 ("POPIA"). This Privacy Policy explains how we collect, use, store, and protect your personal information.</p></section>
        <section><h2 className="text-2xl font-bold mb-4">Contact Us</h2><p className="text-muted-foreground">Email: privacy@nextslot.co.za<br />Address: South Africa</p></section>
      </div>
    </main>
  </div>
);

export default Privacy;

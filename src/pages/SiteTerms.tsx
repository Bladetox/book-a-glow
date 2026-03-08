import SiteHeader from "@/components/site/SiteHeader";

const SiteTerms = () => (
  <div className="min-h-screen nextslot-theme bg-background">
    <SiteHeader />
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: 8 March 2026</p>
      </div>
      <div className="prose prose-lg max-w-none space-y-8">
        <section><h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2><p className="text-muted-foreground">By accessing or using NextSlot's website and services, you agree to be bound by these Terms of Service and all applicable South African laws and regulations.</p></section>
        <section><h2 className="text-2xl font-bold mb-4">Contact Information</h2><p className="text-muted-foreground">Email: legal@nextslot.co.za<br />Address: South Africa</p></section>
      </div>
    </main>
  </div>
);

export default SiteTerms;

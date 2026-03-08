import SiteHeader from "@/components/site/SiteHeader";
import { Link } from "react-router-dom";

const Login = () => (
  <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="max-w-sm mx-auto px-4 py-24">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Welcome back</h1>
      <p className="text-sm text-muted-foreground mb-8">Sign in to your NextSlot dashboard.</p>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
          <input id="email" type="email" placeholder="you@example.com" className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
          <input id="password" type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-[10px] border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
        </div>
        <button type="submit" className="w-full bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-[10px] hover:opacity-90 transition-opacity">Sign In</button>
      </form>
      <p className="text-sm text-muted-foreground text-center mt-6">Don't have an account? <Link to="/onboarding" className="text-foreground font-medium hover:underline">Create one</Link></p>
    </main>
  </div>
);

export default Login;

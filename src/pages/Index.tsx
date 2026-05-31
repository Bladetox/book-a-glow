import { useState, useEffect, useRef } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const GOLD = "#D4A574";
const GOLD_DARK = "#B8915F";

const Index = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const features = [
    { id: 0, name: "Nexty AI Insights", label: "AI-POWERED" },
    { id: 1, name: "Smart Calendar", label: "FULL FEATURE" },
    { id: 2, name: "Client Management", label: "FULL FEATURE" },
    { id: 3, name: "Loyalty Program", label: "NEXTY-POWERED" },
    { id: 4, name: "Stock & Inventory", label: "FULL FEATURE" },
    { id: 5, name: "Consultation Forms", label: "FULL FEATURE" },
    { id: 6, name: "Availability Control", label: "FULL FEATURE" },
    { id: 7, name: "Payments + Deposits", label: "SA PAYMENTS" },
    { id: 8, name: "Customisable Dashboard", label: "FULL FEATURE" },
  ];

  useEffect(() => {
    const startAutoPlay = () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      autoPlayRef.current = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
      }, 5000);
    };
    startAutoPlay();
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [features.length]);

  const handleFeatureClick = (idx: number) => {
    setActiveFeature(idx);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <SiteHeader />
      <main>
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black px-6 py-24">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
              <span className="text-xs font-semibold tracking-widest uppercase">PRO-ACTIVE INTELLIGENCE</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-light mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Your dashboard<br />
              should be <span style={{ color: GOLD, fontStyle: 'italic' }}>speaking.</span>
            </h1>
            
            <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg leading-relaxed">
              Most platforms show you what's happened. NextSlot tells you what's happening. With proactive insights, 
              real-time revenue intelligence, and alerts that surface opportunities before they're missed, 
              you'll always know where to focus next.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to="/onboarding"
                className="px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105"
                style={{ backgroundColor: GOLD, color: '#000' }}
              >
                Start for free
              </Link>
              <Link to="/demo" className="px-8 py-4 text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                See how it works <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <p className="text-sm text-gray-500">No Payment Required · 30-day trial · Set up in under 10 minutes</p>
          </div>
          
          {/* Card World - Visual Dashboard Cards */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-1/4 left-1/4 w-64 h-40 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl" />
            <div className="absolute top-1/3 right-1/4 w-72 h-48 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl" />
          </div>
        </section>

        {/* INTEGRATION TICKER */}
        <div className="bg-white text-black py-3 overflow-hidden">
          <div className="flex items-center gap-12 animate-scroll whitespace-nowrap">
            {[
              "PAYMENT GATEWAY INTEGRATION",
              "WHATSAPP REMINDERS",
              "GOOGLE CALENDAR SYNC",
              "POPIA COMPLIANT",
              "NO SETUP FEES",
              "BUILT FOR SOUTH AFRICAN BUSINESSES",
              "REAL-TIME REVENUE INTELLIGENCE",
              "AI-POWERED INSIGHTS",
            ].concat([
              "PAYMENT GATEWAY INTEGRATION",
              "WHATSAPP REMINDERS",
              "GOOGLE CALENDAR SYNC",
              "POPIA COMPLIANT",
              "NO SETUP FEES",
              "BUILT FOR SOUTH AFRICAN BUSINESSES",
              "REAL-TIME REVENUE INTELLIGENCE",
              "AI-POWERED INSIGHTS",
            ]).map((text, i) => (
              <span key={i} className="text-xs font-semibold tracking-wider" style={{ color: GOLD_DARK }}>
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* NEXTY AI SECTION */}
        <section className="bg-black py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                <span className="text-xs font-semibold tracking-widest uppercase">NEXTY AI · BUSINESS GROWTH ADVISOR</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                A business advisor<br />
                built into <span style={{ color: GOLD, fontStyle: 'italic' }}>every screen.</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Every time you open your dashboard, Nexty scans your bookings, revenue, retention, and capacity. 
                Then tells you exactly what's holding you back and what to do about it.
              </p>
            </div>
            
            {/* Nexty AI Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border" style={{ borderColor: '#333' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm" style={{ color: GOLD }}>Nexty AI</div>
                <div className="text-xs text-gray-500">Updated just now · 4 insights found</div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-black rounded-xl border border-red-900/30">
                  <div className="text-xs font-bold mb-2" style={{ color: '#EF4444' }}>CRITICAL · IMPACT: R 4,800+</div>
                  <p className="text-sm text-gray-300 mb-3">
                    Your cancellation rate jumped to 22% this month. At your current basket of R 580, every cancelled booking costs you R 580. 
                    Introduce a 30% deposit to protect revenue.
                  </p>
                  <button className="text-xs font-semibold" style={{ color: GOLD }}>Go to Settings</button>
                </div>
                
                <div className="p-4 bg-black rounded-xl border border-emerald-900/30">
                  <div className="text-xs font-bold mb-2" style={{ color: '#10B981' }}>GROWTH · CAPACITY OPPORTUNITY</div>
                  <p className="text-sm text-gray-300 mb-3">
                    You have 14 open slots on Thursday afternoons across this month. At your average basket, filling just 6 would add R 3,480. 
                    Consider a Thursday loyalty special.
                  </p>
                  <button className="text-xs font-semibold" style={{ color: GOLD }}>View heatmap</button>
                </div>
                
                <div className="p-4 bg-black rounded-xl border border-blue-900/30">
                  <div className="text-xs font-bold mb-2" style={{ color: '#3B82F6' }}>RETENTION · 38% RATE, BELOW TARGET</div>
                  <p className="text-sm text-gray-300 mb-3">
                    Your retention rate is 38%, just below the 40% beauty benchmark. Enrolling your top 12 unregistered regulars in loyalty 
                    would push this above target within 30 days.
                  </p>
                  <button className="text-xs font-semibold" style={{ color: GOLD }}>Enrol now</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REVENUE INTELLIGENCE */}
        <section className="bg-gradient-to-b from-black to-gray-900 py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                <span className="text-xs font-semibold tracking-widest uppercase">REVENUE INTELLIGENCE</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Not a report card.<br />
                <span style={{ color: GOLD, fontStyle: 'italic' }}>A running coach.</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                NextSlot doesn't just show you revenue, it contextualises every number, projects your month-end, 
                and tells you exactly how far you are from beating last month.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border" style={{ borderColor: '#333' }}>
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">REVENUE THIS MONTH</div>
                <div className="text-5xl font-bold mb-4" style={{ color: GOLD }}>R 22,840</div>
                <div className="text-sm text-gray-400 mb-2">Day 18 of 31  ·  13 days remaining</div>
                <div className="text-lg text-white mb-2">On track for R 39,200 by month-end</div>
                <div className="text-sm" style={{ color: '#10B981' }}>+23% vs last month</div>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#333' }}>
                  <div className="text-sm" style={{ color: GOLD }}>R 4,160 to beat last month · 82% there</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                  <div className="text-xs text-gray-500 mb-1 uppercase">BOOKINGS</div>
                  <div className="text-4xl font-bold mb-1">7</div>
                  <div className="text-xs text-gray-500">today</div>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                  <div className="text-xs text-gray-500 mb-1 uppercase">REVENUE</div>
                  <div className="text-4xl font-bold mb-1" style={{ color: '#10B981' }}>R 1,950</div>
                  <div className="text-xs text-gray-500">paid in</div>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                  <div className="text-xs text-gray-500 mb-1 uppercase">STILL TO COME</div>
                  <div className="text-4xl font-bold mb-1">4</div>
                  <div className="text-xs text-gray-500">remaining</div>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                  <div className="text-xs text-gray-500 mb-1 uppercase">NEXT CLIENT</div>
                  <div className="text-2xl font-bold mb-1">11:30</div>
                  <div className="text-xs text-gray-500">Jess · Full Set</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROACTIVE ALERTS */}
        <section className="bg-black py-24 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
              <span className="text-xs font-semibold tracking-widest uppercase">PROACTIVE ALERTS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-light mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              If it's costing <span style={{ color: GOLD, fontStyle: 'italic' }}>you money</span>, <br />it should not be hiding.
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto text-lg mb-12">
              Your dashboard doesn't wait for you to notice problems. Overdue loyalty clients, 90-day inactive guests, 
              birthday windows closing, rising cancellation rates. NextSlot surfaces all of it the moment you open the app.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                <div className="text-sm font-semibold mb-2">Every alert is <span style={{ color: GOLD }}>one tap from action</span></div>
                <p className="text-sm text-gray-400">WhatsApp drafts pre-loaded, booking and payment links ready</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                <div className="text-sm font-semibold mb-2">Client birthdays & occasions</div>
                <p className="text-sm text-gray-400">Tracked automatically and surfaced when they matter</p>
              </div>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border" style={{ borderColor: '#333' }}>
                <div className="text-sm font-semibold mb-2">Loyalty rewards tracked</div>
                <p className="text-sm text-gray-400">Never miss a client who has earned a free treatment</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOOKING HEATMAP */}
        <section className="bg-gradient-to-b from-gray-900 to-black py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                <span className="text-xs font-semibold tracking-widest uppercase">BOOKING INTELLIGENCE</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Know when<br />
                <span style={{ color: GOLD, fontStyle: 'italic' }}>your clients want you.</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                The booking heatmap shows every day and time slot colour-coded by demand. Know your peaks. Fill your quiet slots. 
                Never discount a prime window again.
              </p>
            </div>
            
            {/* Heatmap */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border" style={{ borderColor: '#333' }}>
              <div className="text-xs text-gray-500 mb-4 uppercase tracking-wider">BOOKING HEATMAP · THIS MONTH</div>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-sm">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="px-2 py-2 text-xs text-gray-500">08–10</th>
                      <th className="px-2 py-2 text-xs text-gray-500">10–12</th>
                      <th className="px-2 py-2 text-xs text-gray-500">12–14</th>
                      <th className="px-2 py-2 text-xs text-gray-500">14–16</th>
                      <th className="px-2 py-2 text-xs text-gray-500">16–18</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { day: 'Mon', slots: [6, 9, 5, 7, 4] },
                      { day: 'Tue', slots: [2, 3, 2, 1, 2] },
                      { day: 'Wed', slots: [7, 11, 8, 9, 6] },
                      { day: 'Thu', slots: [4, 6, 5, 3, 4] },
                      { day: 'Fri', slots: [10, 14, 12, 13, 9] },
                      { day: 'Sat', slots: [15, 18, 16, 14, 11] },
                      { day: 'Sun', slots: [3, 4, 2, 2, 1] },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="px-2 py-2 text-xs font-semibold">{row.day}</td>
                        {row.slots.map((count, j) => {
                          const intensity = count < 4 ? 'bg-gray-800' : count < 8 ? 'bg-yellow-900/40' : count < 12 ? 'bg-yellow-700/60' : 'bg-yellow-500/80';
                          return (
                            <td key={j} className="px-2 py-2">
                              <div className={`${intensity} rounded px-2 py-1 text-xs`}>{count}</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 text-sm text-gray-400">
                <span style={{ color: GOLD }}>Sat 10–12 is your busiest slot</span> — Never discount this. 
                Tue afternoons are wide open, run a targeted offer or take the rest of the day off to recharge.
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES CAROUSEL */}
        <section className="bg-black py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                <span className="text-xs font-semibold tracking-widest uppercase">EVERYTHING IN ONE PLACE</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                The full stack for<br />
                <span style={{ color: GOLD, fontStyle: 'italic' }}>service businesses</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Bookings, calendar, stock, loyalty, and Intelligent insights, all inside one dashboard, all talking to each other.
              </p>
            </div>
            
            {/* Feature Tabs */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {features.map((feature, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFeatureClick(idx)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    activeFeature === idx ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                >
                  {feature.name}
                </button>
              ))}
            </div>
            
            {/* Feature Display */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border" style={{ borderColor: '#333' }}>
              {activeFeature === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-xs font-semibold" style={{ color: GOLD }}>AI-POWERED</div>
                    <div className="text-xs text-gray-500">ALWAYS LEARNING</div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Nexty AI Insights</h3>
                  <p className="text-gray-400 mb-6">
                    Proactive Critical, Growth, Retention, and Operations insights, ranked by rand impact. 
                    Your Pro-active Intelligent business advisor, always on, never asleep.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-black rounded-lg">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                      <div className="text-xs">CRITICAL: 3 clients lapsed 14+ days. R1,200 at risk</div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-black rounded-lg">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
                      <div className="text-xs">GROWTH: Tuesday 10–12pm converts 2.4× better. Add premium tier</div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeFeature === 1 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-xs font-semibold" style={{ color: GOLD }}>FULL FEATURE</div>
                    <div className="text-xs text-gray-500">LIVE BOOKING</div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Smart Calendar</h3>
                  <p className="text-gray-400 mb-6">
                    Day, week, and month views. Mobile date strip. Payment status visible at a glance. 
                    Reschedule in two taps. Call-out bookings tracked separately.
                  </p>
                  <div className="space-y-3">
                    <div className="p-4 bg-black rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">09:00</div>
                      <div className="font-semibold">Amara Dube</div>
                      <div className="text-sm text-gray-400">Brazilian Blowout · 2h</div>
                      <div className="text-xs mt-2" style={{ color: '#10B981' }}>Paid</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add other feature content similarly */}
              {activeFeature >= 2 && (
                <div>
                  <div className="text-xs font-semibold mb-6" style={{ color: GOLD }}>{features[activeFeature].label}</div>
                  <h3 className="text-2xl font-semibold mb-4">{features[activeFeature].name}</h3>
                  <p className="text-gray-400">Full feature details coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="bg-gradient-to-b from-gray-900 to-black py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 px-4 py-2 rounded-full" style={{ border: `1px solid ${GOLD}`, color: GOLD }}>
                <span className="text-xs font-semibold tracking-widest uppercase">WHY NEXTSLOT</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                The dashboard others<br />
                <span style={{ color: GOLD, fontStyle: 'italic' }}>forgot to build.</span>
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#333' }}>
                    <th className="text-left py-4 px-4 font-semibold">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-500">Other booking tools</th>
                    <th className="text-center py-4 px-4 font-semibold" style={{ color: GOLD }}>NextSlot</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Online booking page', '✓', '✓'],
                    ['Basic dashboard & stats', '✓', '✓'],
                    ['Revenue projection this month', '—', '✓'],
                    ['Goal-gradient: R X to beat last month', '—', '✓'],
                    ['Proactive AI business insights', '—', '✓ Nexty AI'],
                    ['Booking heatmap (demand by day/time)', '—', '✓'],
                    ['Inactive client alerts (90 days)', '—', '✓'],
                    ['Loyalty program with AI enrolment', 'Some tools', '✓ AI-suggested'],
                    ['Lead source / acquisition tracking', '—', '✓'],
                    ['Stock alerts on dashboard', '—', '✓'],
                    ['Built for South African businesses', 'Rarely', '✓ Yoco · ZAR · POPIA'],
                  ].map((row, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: '#222' }}>
                      <td className="py-4 px-4 text-gray-300">{row[0]}</td>
                      <td className="py-4 px-4 text-center text-gray-500">{row[1]}</td>
                      <td className="py-4 px-4 text-center font-semibold" style={{ color: GOLD }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-black py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-light mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Stop watching numbers.<br />
              Start <span style={{ color: GOLD, fontStyle: 'italic' }}>hearing</span> them.
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Set up in under 10 minutes. Your booking page, your dashboard, and Nexty AI working for you from day one.
            </p>
            <Link
              to="/onboarding"
              className="inline-block px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              style={{ backgroundColor: GOLD, color: '#000' }}
            >
              Start free. No payment needed
            </Link>
            <p className="text-sm text-gray-500 mt-6">30-day trial · No Payment required · Cancel anytime · Built for South Africa</p>
          </div>
        </section>
      </main>
      <SiteFooter />
      
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Index;

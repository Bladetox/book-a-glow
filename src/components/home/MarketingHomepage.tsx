import { Link } from "react-router-dom";
import { C, FONT_BODY, FONT_DISPLAY, BP } from "./tokens";
import { useWindowWidth } from "./useWindowWidth";
import heroImage from "../../assets/NexSlot_Hero.png";

const Section = ({ children, eyebrow, title, body, dark = false }: {
  children?: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  dark?: boolean;
}) => {
  const width = useWindowWidth();
  const mobile = width < BP;
  return (
    <section style={{ padding: mobile ? "72px 24px" : "112px 40px", background: dark ? C.s1 : C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ maxWidth: 680, marginBottom: mobile ? 36 : 56 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, marginBottom: 14 }}>{eyebrow}</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: mobile ? "clamp(28px,8vw,38px)" : "clamp(32px,4vw,50px)", lineHeight: 1.08, fontWeight: 750, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
          {body && <p style={{ margin: "18px 0 0", fontFamily: FONT_BODY, fontSize: 16, lineHeight: 1.75, color: C.muted }}>{body}</p>}
        </div>
        {children}
      </div>
    </section>
  );
};

const Card = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <div style={{
    background: accent ? "rgba(212,165,116,0.07)" : C.s2,
    border: `1px solid ${accent ? "rgba(212,165,116,0.30)" : C.border}`,
    borderRadius: 18,
    padding: 24,
  }}>{children}</div>
);

const FlowStep = ({ n, title, text }: { n: string; title: string; text: string }) => (
  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
    <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.gold, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800 }}>{n}</div>
    <div>
      <h3 style={{ margin: "2px 0 7px", fontFamily: FONT_DISPLAY, fontSize: 19, color: C.text }}>{title}</h3>
      <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.7, color: C.muted }}>{text}</p>
    </div>
  </div>
);

export const MarketingHomepage = () => {
  const width = useWindowWidth();
  const mobile = width < BP;

  return (
    <>
      <section style={{ position: "relative", minHeight: mobile ? 820 : 760, display: "flex", alignItems: "center", overflow: "hidden", background: C.bg }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center 35%", opacity: 0.72 }} />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: mobile ? "linear-gradient(180deg,rgba(8,8,8,.90),rgba(8,8,8,.78) 55%,rgba(8,8,8,.96))" : "linear-gradient(90deg,rgba(8,8,8,.94) 0%,rgba(8,8,8,.82) 52%,rgba(8,8,8,.48) 100%)" }} />
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1120, margin: "0 auto", padding: mobile ? "116px 24px 64px" : "120px 40px 80px", display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.05fr .95fr", gap: mobile ? 48 : 56, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", padding: "7px 11px", borderRadius: 999, background: "rgba(212,165,116,.10)", border: "1px solid rgba(212,165,116,.24)", color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 24 }}>Online booking + business management software</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: mobile ? "clamp(38px,11vw,54px)" : "clamp(48px,5.5vw,72px)", lineHeight: .98, letterSpacing: "-.035em", fontWeight: 800, color: C.text, margin: 0 }}>
              More than bookings.<br /><span style={{ color: C.gold }}>Built for growth.</span>
            </h1>
            <p style={{ fontFamily: FONT_BODY, fontSize: mobile ? 16 : 18, lineHeight: 1.7, color: C.muted, maxWidth: 570, margin: "24px 0 0" }}>
              NextSlot helps independent service businesses manage bookings, payments, clients and day-to-day operations, then turns that business data into practical opportunities for growth.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
              <Link to="/onboarding" style={{ background: C.gold, color: "#080808", padding: "15px 25px", borderRadius: 9, textDecoration: "none", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 800 }}>Try NextSlot free</Link>
              <Link to="/demo" style={{ background: "rgba(8,8,8,.58)", border: `1px solid ${C.border2}`, color: C.text, padding: "15px 25px", borderRadius: 9, textDecoration: "none", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700 }}>See how it works</Link>
            </div>
            <p style={{ margin: "12px 0 0", color: C.faint, fontFamily: FONT_BODY, fontSize: 11 }}>No payment required · Free trial · Built in South Africa</p>
          </div>

          <div style={{ position: "relative", minHeight: mobile ? 290 : 400 }}>
            <div style={{ position: "absolute", inset: mobile ? "15px 8px" : "20px 0", borderRadius: 24, background: "rgba(8,8,8,.70)", border: "1px solid rgba(212,165,116,.22)", backdropFilter: "blur(14px)", boxShadow: "0 24px 70px rgba(0,0,0,.45)", padding: mobile ? 18 : 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div><div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: ".12em" }}>Business today</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: 25, color: C.text, fontWeight: 700, marginTop: 5 }}>Everything in one place</div></div>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%,#fff0b5 0%,#d4a574 42%,#8a5b00 100%)", boxShadow: "0 6px 24px rgba(212,165,116,.35)" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Bookings", "7 today", C.gold],
                  ["Payments", "R 1,950 paid", C.em],
                  ["Clients", "4 returning", C.text],
                  ["Open slots", "6 worth filling", C.blue],
                ].map(([a,b,c]) => <div key={a} style={{ padding: "15px 14px", borderRadius: 12, background: "rgba(255,255,255,.035)", border: `1px solid ${C.border}` }}><div style={{ fontSize: 9, color: C.faint, textTransform: "uppercase", letterSpacing: ".1em" }}>{a}</div><div style={{ marginTop: 7, fontFamily: FONT_DISPLAY, fontSize: 17, color: c, fontWeight: 700 }}>{b}</div></div>)}
              </div>
              <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "rgba(212,165,116,.07)", border: "1px solid rgba(212,165,116,.16)" }}>
                <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em" }}>Nexty · Growth</div>
                <div style={{ marginTop: 6, color: C.text, fontSize: 12, lineHeight: 1.6 }}>Thursday afternoons are consistently quieter. You have room to create demand before opening more hours.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "rgba(212,165,116,.035)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: mobile ? 10 : 0 }}>
          {["Online bookings", "Payments & deposits", "Client management", "Google Calendar", "WhatsApp", "POPIA ready", "Business insights"].map((x, i) => <span key={x} style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.muted, padding: "0 16px", borderRight: i < 6 && !mobile ? `1px solid ${C.border}` : "none" }}>{x}</span>)}
        </div>
      </div>

      <Section eyebrow="Start with the problem" title={<>If your business still runs through <span style={{ color: C.gold }}>messages, memory and spreadsheets</span>, you are not alone.</>} body="Most independent service businesses start that way. A client sends a message, you check your diary, confirm a slot, send payment details, remember the appointment and then try to keep track of what happened afterwards. NextSlot brings that work into one system.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
          <Card><div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: ".12em" }}>Before</div><h3 style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 20, margin: "12px 0 9px" }}>“Is 4pm still available?”</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Messages, back-and-forth and checking your diary.</p></Card>
          <Card><div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: ".12em" }}>With NextSlot</div><h3 style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 20, margin: "12px 0 9px" }}>Clients see your availability</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>They choose a service and slot from your online booking page.</p></Card>
          <Card accent><div style={{ fontSize: 10, color: C.gold, textTransform: "uppercase", letterSpacing: ".12em" }}>Then</div><h3 style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 20, margin: "12px 0 9px" }}>You see the business</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Bookings become payments, client history and business data you can act on.</p></Card>
        </div>
      </Section>

      <Section dark eyebrow="The system" title={<>One place to <span style={{ color: C.gold }}>run the business behind the booking.</span></>} body="NextSlot is not just a booking page. It connects the everyday work of an appointment-based business, so you spend less time moving information around and more time doing the work.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 18 }}>
          <Card><FlowStep n="01" title="Get booked" text="Create services, set availability and let clients book online without needing an account." /><div style={{ height: 22 }} /><FlowStep n="02" title="Get paid" text="Take deposits and payments through supported South African payment options, with payment status attached to the booking." /><div style={{ height: 22 }} /><FlowStep n="03" title="Know your clients" text="Keep visit history, client details, loyalty, alerts and consultation information together." /></Card>
          <Card accent><FlowStep n="04" title="Run the day" text="Manage your calendar, availability, stock, consultations and operational tasks from the dashboard." /><div style={{ height: 22 }} /><FlowStep n="05" title="Understand what is happening" text="See revenue, demand, retention, acquisition and service performance instead of relying on gut feel." /><div style={{ height: 22 }} /><FlowStep n="06" title="Know what to do next" text="Nexty uses your business data to surface problems, opportunities and practical actions." /></Card>
        </div>
      </Section>

      <Section eyebrow="Business intelligence" title={<>Stop asking <span style={{ color: C.gold }}>“How is the business doing?”</span> and start seeing why.</>} body="Your bookings already contain useful information. NextSlot turns that information into a clearer view of revenue, demand, clients and operations.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.15fr .85fr", gap: 18 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 22 }}><div><div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: ".12em" }}>Revenue this month</div><div style={{ fontFamily: FONT_DISPLAY, fontSize: mobile ? 36 : 48, color: C.gold, fontWeight: 750, marginTop: 7 }}>R 22,840</div></div><div style={{ color: C.em, fontSize: 12, fontWeight: 700 }}>+23% vs last month</div></div>
            <div style={{ height: 100, display: "flex", alignItems: "end", gap: 7 }}>
              {[28,42,35,52,48,64,58,73,69,82,78,92].map((v,i)=><div key={i} style={{ flex:1, height: `${v}%`, borderRadius: "5px 5px 2px 2px", background: i > 8 ? C.gold : "rgba(212,165,116,.24)" }} />)}
            </div>
            <p style={{ color: C.faint, fontSize: 11, margin: "12px 0 0" }}>Revenue trend · example dashboard view</p>
          </Card>
          <div style={{ display: "grid", gap: 12 }}>
            <Card><div style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>Demand</div><h3 style={{ color: C.text, fontFamily: FONT_DISPLAY, fontSize: 18, margin: "8px 0" }}>When do clients actually book?</h3><p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>Use booking patterns to see your busiest and quietest windows.</p></Card>
            <Card><div style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>Retention</div><h3 style={{ color: C.text, fontFamily: FONT_DISPLAY, fontSize: 18, margin: "8px 0" }}>Who is coming back?</h3><p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>Understand returning clients, inactive clients and loyalty opportunities.</p></Card>
            <Card><div style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>Performance</div><h3 style={{ color: C.text, fontFamily: FONT_DISPLAY, fontSize: 18, margin: "8px 0" }}>What is actually driving revenue?</h3><p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>See which services, time slots and acquisition sources are contributing.</p></Card>
          </div>
        </div>
      </Section>

      <Section dark eyebrow="Nexty · Business Growth Advisor" title={<>Your numbers already know <span style={{ color: C.gold }}>what to do next.</span></>} body="Nexty is the intelligence layer inside NextSlot. It looks at the activity already happening in your business and turns patterns into useful prompts, not generic advice.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "280px 1fr", gap: mobile ? 28 : 56, alignItems: "center" }}>
          <div style={{ minHeight: mobile ? 180 : 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: mobile ? 88 : 118, height: mobile ? 88 : 118, borderRadius: "50%", background: "radial-gradient(circle at 30% 25%,#fff2c5 0%,#e2bd8b 24%,#c69257 55%,#7d4d12 100%)", boxShadow: "0 18px 55px rgba(212,165,116,.30), inset -8px -10px 18px rgba(0,0,0,.24), inset 5px 5px 12px rgba(255,240,190,.25)" }} />
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              ["Critical", "Cancellations are costing you money. Nexty flags the pattern so you can address it."],
              ["Growth", "A quiet window keeps appearing. Nexty points to the opportunity before you simply add more hours."],
              ["Retention", "Clients are falling inactive. Nexty helps you see who needs attention."],
              ["Operations", "Stock, availability or other operational issues can quietly interrupt revenue. Nexty surfaces them."],
            ].map(([label, text], i) => <Card key={label} accent={i === 1}><div style={{ color: i === 0 ? C.red : C.gold, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em" }}>{label}</div><p style={{ color: C.text, fontSize: 13, lineHeight: 1.65, margin: "7px 0 0" }}>{text}</p></Card>)}
          </div>
        </div>
      </Section>

      <Section eyebrow="Built around how you work" title={<>Work from your place, travel to clients, or <span style={{ color: C.gold }}>do both.</span></>} body="NextSlot adapts to the way an independent service business operates. Fixed location, mobile or a mix of both.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 16 }}>
          <Card><h3 style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 20, margin: "0 0 10px" }}>Fixed location</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Set your working hours and let clients book into the availability you control.</p></Card>
          <Card><h3 style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 20, margin: "0 0 10px" }}>Mobile services</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Calculate travel and call-out fees as part of the booking process.</p></Card>
          <Card accent><h3 style={{ fontFamily: FONT_DISPLAY, color: C.text, fontSize: 20, margin: "0 0 10px" }}>Both</h3><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>Keep one system when your business serves clients at your location and theirs.</p></Card>
        </div>
      </Section>

      <Section dark eyebrow="Made for South Africa" title={<>The software should fit the way <span style={{ color: C.gold }}>you actually do business.</span></>} body="NextSlot is built in South Africa for independent service businesses here, with local payment options, familiar communication channels and POPIA-conscious data handling.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {["Yoco", "PayShap", "PayFast", "iKhokha", "WhatsApp", "Google Calendar", "ZAR", "POPIA"].map(x => <span key={x} style={{ padding: "11px 15px", borderRadius: 10, background: C.s2, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 600 }}>{x}</span>)}
        </div>
      </Section>

      <Section eyebrow="Proof, not promises" title={<>What happens when a real business <span style={{ color: C.gold }}>starts using the system?</span></>} body="PhenomeBeauty is a Cape Town mobile beauty business run by Shu-meez Sylvester. After years of WhatsApp bookings, EFT deposits and manual tracking, NextSlot brought the booking and business information into one place.">
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.1fr .9fr", gap: 18 }}>
          <Card accent>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>PhenomeBeauty · Cape Town</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: mobile ? 40 : 54, fontWeight: 800, color: C.text, marginTop: 14 }}>R63,851</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>over 90 days</div>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7, margin: "20px 0 0" }}>NextSlot facilitated bookings and business growth resulting in R63,851 over 90 days.</p>
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}`, color: C.gold, fontWeight: 800, fontSize: 13 }}>+68% vs previous period</div>
          </Card>
          <Card>
            <div style={{ fontSize: 10, color: C.faint, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>What changed</div>
            <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
              <FlowStep n="1" title="Bookings became structured" text="Clients could book into real availability instead of relying on message threads." />
              <FlowStep n="2" title="Payments became visible" text="Deposits and balances could be connected to the booking." />
              <FlowStep n="3" title="The business became measurable" text="Revenue, clients, services and demand could be seen together." />
            </div>
            <Link to="/about#case-study" style={{ display: "inline-flex", marginTop: 24, color: C.gold, textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Read the PhenomeBeauty story →</Link>
          </Card>
        </div>
      </Section>

      <section style={{ padding: mobile ? "80px 24px" : "120px 24px", background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>Start with the business you have</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: mobile ? 34 : 52, lineHeight: 1.05, color: C.text, margin: 0 }}>Get booked. Get paid.<br /><span style={{ color: C.gold }}>Know what to do next.</span></h2>
          <p style={{ color: C.muted, fontFamily: FONT_BODY, fontSize: 16, lineHeight: 1.75, maxWidth: 540, margin: "20px auto 32px" }}>Start with the booking system you need today. As your business grows, NextSlot gives you more of the information and tools you need to run it better.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link to="/onboarding" style={{ background: C.gold, color: "#080808", padding: "15px 27px", borderRadius: 9, textDecoration: "none", fontWeight: 800, fontSize: 14 }}>Try NextSlot free</Link>
            <Link to="/pricing" style={{ background: C.s2, border: `1px solid ${C.border2}`, color: C.text, padding: "15px 27px", borderRadius: 9, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>View pricing</Link>
          </div>
          <p style={{ color: C.faint, fontSize: 11, marginTop: 14 }}>No payment required · Free trial · Cancel anytime</p>
        </div>
      </section>
    </>
  );
};

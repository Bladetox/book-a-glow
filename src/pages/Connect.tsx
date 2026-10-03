import { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";

type Role = "tech" | "salon";

type Opportunity = {
  id: string;
  date: string;
  time: string;
  salon: string;
  area: string;
  tier: string;
  fee: string;
  terms: string;
  specializations: string[];
  interested: number;
};

const opportunities: Opportunity[] = [
  {
    id: "1",
    date: "Sat, 12 Oct",
    time: "09:00–17:00",
    salon: "Jenna Jane's Collectives",
    area: "Sea Point",
    tier: "Senior",
    fee: "R250 chair fee",
    terms: "or 70/30 commission",
    specializations: ["Acrylic", "Gel"],
    interested: 3,
  },
  {
    id: "2",
    date: "Sun, 13 Oct",
    time: "10:00–16:00",
    salon: "Glam Studio",
    area: "Claremont",
    tier: "Any tier",
    fee: "R180 chair fee",
    terms: "or 70/30 commission",
    specializations: ["Gel", "Nail Art"],
    interested: 1,
  },
  {
    id: "3",
    date: "Tue, 15 Oct",
    time: "08:30–15:30",
    salon: "The Nail Room",
    area: "Gardens",
    tier: "Intermediate",
    fee: "R220 chair fee",
    terms: "products included",
    specializations: ["Acrylic"],
    interested: 2,
  },
];

const bookings = [
  { date: "Sat, 12 Oct", tech: "Thandi Mokoena", status: "Confirmed" },
  { date: "Sun, 13 Oct", tech: "Leigh Adams", status: "Pending check-in" },
  { date: "Fri, 11 Oct", tech: "Nomsa Diamini", status: "Completed" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111] text-white shadow-sm">
        <Sparkles size={17} />
      </div>
      <div>
        <div className="text-sm font-semibold tracking-[0.18em] text-neutral-950">NEXTSLOT</div>
        <div className="-mt-0.5 text-[9px] font-medium tracking-[0.28em] text-neutral-400">CONNECT</div>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  selected,
  onInterest,
}: {
  opportunity: Opportunity;
  selected: boolean;
  onInterest: () => void;
}) {
  return (
    <article className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_14px_40px_rgba(0,0,0,0.07)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {opportunity.date}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-neutral-800">
            <Clock3 size={15} />
            {opportunity.time}
          </div>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
          {opportunity.tier}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-neutral-950">{opportunity.salon}</h3>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
        <MapPin size={14} />
        {opportunity.area}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {opportunity.specializations.map((item) => (
          <span key={item} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-5 border-t border-neutral-100 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">{opportunity.fee}</div>
            <div className="text-xs text-neutral-500">{opportunity.terms}</div>
          </div>
          <button
            onClick={onInterest}
            className="rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
          >
            {selected ? "Interested ✓" : "Express interest"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TechView() {
  const [search, setSearch] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(
    () =>
      opportunities.filter((item) =>
        [item.salon, item.area, item.tier, ...item.specializations]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  );

  const toggleInterest = (id: string) =>
    setInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-[#fafafa]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-neutral-500 md:flex">
            <a className="font-medium text-neutral-950" href="#opportunities">Opportunities</a>
            <a href="#bookings" className="hover:text-neutral-950">My bookings</a>
            <a href="#reliability" className="hover:text-neutral-950">Reliability</a>
            <a href="#profile" className="hover:text-neutral-950">Profile</a>
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-full border border-neutral-200 bg-white p-2.5 sm:block" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <button
              className="rounded-full border border-neutral-200 bg-white p-2.5 md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Open navigation"
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white sm:flex">
              TM
            </div>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-neutral-200 bg-white px-5 py-4 md:hidden">
            <div className="grid gap-3 text-sm">
              <a href="#opportunities">Opportunities</a>
              <a href="#bookings">My bookings</a>
              <a href="#reliability">Reliability</a>
              <a href="#profile">Profile</a>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-center lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Tech home</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Hi, Thandi</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Find open chair opportunities that fit your availability and specializations.
              </p>
            </div>
            <div id="reliability" className="rounded-2xl border border-neutral-200 bg-[#fafafa] p-5 md:min-w-[250px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">Reliability score</span>
                <Star size={17} className="fill-current" />
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight">4.8</span>
                <span className="pb-1 text-sm text-neutral-500">/ 5.0</span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">Based on 47 completed bookings</div>
            </div>
          </div>
        </section>

        <section id="opportunities" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Available opportunities</h2>
              <p className="mt-1 text-sm text-neutral-500">{filtered.length} opportunities match your profile.</p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:max-w-xs">
              <Search size={16} className="text-neutral-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search salons, areas, skills…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {filtered.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                selected={interests.includes(opportunity.id)}
                onInterest={() => toggleInterest(opportunity.id)}
              />
            ))}
          </div>
        </section>

        <section id="bookings" className="border-y border-neutral-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:px-6 md:grid-cols-2 lg:px-8">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">My bookings</h2>
                  <p className="mt-1 text-sm text-neutral-500">Your confirmed Connect activity.</p>
                </div>
                <CalendarDays size={20} className="text-neutral-400" />
              </div>
              <div className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                {bookings.map((booking) => (
                  <div key={booking.date + booking.tech} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="text-sm font-medium">{booking.date}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">{booking.tech}</div>
                    </div>
                    <span className="text-xs font-semibold text-neutral-600">{booking.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="profile" className="rounded-2xl border border-neutral-200 bg-[#fafafa] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">TM</div>
                <div>
                  <h3 className="font-semibold">Thandi Mokoena</h3>
                  <p className="text-xs text-neutral-500">Senior tech · Acrylic · Gel · 5 years</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="text-xs text-neutral-400">Completed</div>
                  <div className="mt-1 font-semibold">47 bookings</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <div className="text-xs text-neutral-400">No shows</div>
                  <div className="mt-1 font-semibold">0</div>
                </div>
              </div>
              <button className="mt-4 flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium">
                Manage profile <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SalonView() {
  const [posted, setPosted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f6] text-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-neutral-500 md:flex">
            <a className="font-medium text-neutral-950" href="#salon-opportunities">Opportunities</a>
            <a href="#salon-bookings">Bookings</a>
            <a href="#salon-interests">Interested techs</a>
            <a href="#settings">Settings</a>
          </nav>
          <div className="flex items-center gap-2">
            <button className="rounded-full border border-neutral-200 bg-white p-2.5" aria-label="Notifications"><Bell size={17} /></button>
            <button className="rounded-full border border-neutral-200 bg-white p-2.5 md:hidden" onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white sm:flex">JJ</div>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-neutral-200 bg-white px-5 py-4 md:hidden">
            <div className="grid gap-3 text-sm">
              <a href="#salon-opportunities">Opportunities</a>
              <a href="#salon-bookings">Bookings</a>
              <a href="#salon-interests">Interested techs</a>
              <a href="#settings">Settings</a>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Salon dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Jenna Jane's Collectives</h1>
            <p className="mt-2 text-sm text-neutral-500">Post open chair slots and manage interested independent techs.</p>
          </div>
          <button
            onClick={() => setPosted(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-neutral-800"
          >
            + Post opportunity
          </button>
        </section>

        {posted && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={19} />
              <div>
                <div className="text-sm font-semibold">Opportunity draft created</div>
                <div className="text-xs text-neutral-500">The next step is to complete the opportunity terms.</div>
              </div>
            </div>
            <button onClick={() => setPosted(false)} aria-label="Dismiss"><X size={17} /></button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Open slots", "2", "currently accepting interest"],
            ["Interested techs", "5", "across open slots"],
            ["Confirmed bookings", "3", "upcoming"],
            ["Completed", "12", "this month"],
          ].map(([label, value, helper]) => (
            <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.13em] text-neutral-400">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
              <div className="mt-1 text-xs text-neutral-500">{helper}</div>
            </div>
          ))}
        </section>

        <section id="salon-opportunities" className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Open opportunities</h2>
              <p className="mt-1 text-sm text-neutral-500">Manage your published chair slots.</p>
            </div>
            <CalendarDays size={19} className="text-neutral-400" />
          </div>
          <div className="mt-5 space-y-3">
            {opportunities.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold">{item.date} · {item.time}</div>
                    <div className="mt-1 text-xs text-neutral-500">{item.tier} tech · {item.interested} interested</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium">View interests</button>
                    <button className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium">Edit</button>
                    <button className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium">Cancel</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="salon-interests" className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Interested techs</h2>
                <p className="mt-1 text-sm text-neutral-500">Review profiles before offering an opportunity.</p>
              </div>
              <Users size={19} className="text-neutral-400" />
            </div>
            <div className="mt-5 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {[
                ["Thandi Mokoena", "4.8", "Senior", "Acrylic, Gel"],
                ["Leigh Adams", "4.9", "Senior", "Gel, Nail Art"],
                ["Nomsa Diamini", "4.5", "Intermediate", "Acrylic"],
              ].map(([name, score, tier, skills]) => (
                <div key={name} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                      {name.split(" ").map((part) => part[0]).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{name}</div>
                      <div className="text-xs text-neutral-500">★ {score} · {tier} · {skills}</div>
                    </div>
                  </div>
                  <button className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">Offer opportunity</button>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck size={14} /> Offers are voluntary; the tech can accept or decline.
            </p>
          </div>

          <div id="salon-bookings" className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
            <h2 className="font-semibold">Recent bookings</h2>
            <div className="mt-5 space-y-3">
              {bookings.map((booking) => (
                <div key={booking.date + booking.tech} className="flex items-center justify-between rounded-xl bg-neutral-50 p-3.5">
                  <div>
                    <div className="text-sm font-medium">{booking.date}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">{booking.tech}</div>
                  </div>
                  <CheckCircle2 size={16} className="text-neutral-500" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="settings" className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-950 p-6 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">NextSlot Core integration</div>
              <h2 className="mt-2 text-xl font-semibold">Connect your Core account</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-400">
                Link accounts to support booking sync and access Connect from the Core dashboard.
              </p>
            </div>
            <button className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-950">
              Link account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Connect() {
  const [role, setRole] = useState<Role>("tech");

  return (
    <div>
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-lg">
        <button
          onClick={() => setRole("tech")}
          className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${role === "tech" ? "bg-neutral-950 text-white" : "text-neutral-500"}`}
        >
          Tech
        </button>
        <button
          onClick={() => setRole("salon")}
          className={`rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${role === "salon" ? "bg-neutral-950 text-white" : "text-neutral-500"}`}
        >
          Salon
        </button>
      </div>
      {role === "tech" ? <TechView /> : <SalonView />}
    </div>
  );
}

import Link from "next/link";

const metrics = [
  {
    value: "6",
    label: "Built-in scenarios",
    detail: "Static route cases plus an ongoing multi-driver dispatch simulation around Indianapolis.",
  },
  {
    value: "6",
    label: "Routing strategies",
    detail: "Greedy baselines and intentionally high-contrast sweep and bounce heuristics for comparison.",
  },
  {
    value: "Browser + CLI",
    label: "Experiment runner",
    detail: "Seeded batch comparisons save CSV and JSON summaries into the project outputs folder.",
  },
];

const goals = [
  "Compare six routing heuristics across repeatable Indianapolis-area delivery scenarios.",
  "Visualize drivers, pickups, dropoffs, event timelines, and routes on an interactive map.",
  "Inspect both single-route playback and an ongoing dispatch simulation with multiple drivers.",
];

const projectSections = [
  {
    title: "Interactive Route Demo",
    description:
      "Open scripted scenarios, switch among routing algorithms, and step through the route with playback controls, timeline events, and stop-by-stop map updates.",
  },
  {
    title: "Ongoing Dispatch Simulation",
    description:
      "Use the multi-driver dispatch scenario to watch incoming orders get assigned over time with the current availability-plus-distance policy that determines what driver to give an order to.",
  },
  {
    title: "Seeded Experiment Dashboard",
    description:
      "Run repeatable browser experiments or the CLI batch script and review saved summaries for distance, ETA, spread, and route-validity comparisons.",
  },
];

const stack = ["Next.js App Router", "React 19", "Leaflet", "Vitest", "Node experiment scripts", "OSRM road-routing comparison"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff7d8_0%,#f4efe2_38%,#e8e1d2_100%)] text-stone-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-stone-900/10 bg-white/70 p-6 shadow-[0_20px_60px_rgba(70,52,24,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              Spring 2026 Capstone
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
              Food Delivery Routing Simulator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
              A web-based capstone project for comparing food-delivery routing strategies across
              scripted Indianapolis scenarios, interactive playback views, and reproducible seeded
              experiments.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:w-[22rem] md:grid-cols-1">
            <Link
              href="/route-demo"
              className="inline-flex items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold !text-white transition hover:bg-stone-800"
            >
              Open Route Demo
            </Link>
            <Link
              href="/experiments"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950"
            >
              Open Experiments
            </Link>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr] lg:items-start">
          <div className="rounded-[2rem] bg-stone-950 px-7 py-8 text-stone-100 shadow-[0_24px_80px_rgba(41,32,17,0.22)]">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-300">
              Problem Focus
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              How should a delivery platform route orders when distance, ETA realism, and operational tradeoffs all matter?
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {metrics.map((item) => (
                <article
                  key={item.label}
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-3xl font-semibold text-amber-300">{item.value}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{item.label}</div>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(70,52,24,0.08)] backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-700">
              Current Scope
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-stone-700 sm:text-base">
              {goals.map((goal) => (
                <li key={goal} className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-600" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 rounded-[1.5rem] bg-amber-50 p-5 text-sm leading-6 text-stone-700">
              The project emphasizes simulation, visualization, and side-by-side evaluation rather
              than inventing a brand-new routing algorithm. The current build is focused on making
              route behavior and tradeoffs easy to demonstrate.
            </div>
          </div>
        </section>

        <section
          id="project-overview"
          className="grid gap-6 rounded-[2rem] border border-stone-900/10 bg-white/75 p-7 shadow-[0_20px_60px_rgba(70,52,24,0.08)] backdrop-blur lg:grid-cols-3"
        >
          {projectSections.map((item) => (
            <article key={item.title} className="rounded-[1.5rem] bg-stone-100/80 p-5">
              <h2 className="text-xl font-semibold tracking-tight text-stone-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700 sm:text-base">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6">
          <article className="rounded-[2rem] bg-[linear-gradient(135deg,#7c4a14_0%,#a05b21_45%,#d79a43_100%)] p-7 text-white shadow-[0_24px_80px_rgba(109,63,18,0.24)]">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-100">
              Tech Stack
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

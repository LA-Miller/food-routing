import Link from "next/link";

const metrics = [
  {
    value: "5",
    label: "Built-in scenarios",
    detail: "Downtown, lunch rush, suburb loop, cross-city, and verification cases.",
  },
  {
    value: "6",
    label: "Routing strategies",
    detail: "From practical greedy baselines to intentionally silly sweep and bounce heuristics.",
  },
  {
    value: "Live",
    label: "Experiment outputs",
    detail: "Run seeded comparisons from the browser and save CSV/JSON summaries automatically.",
  },
];

const goals = [
  "Compare dispatch strategies under realistic city-delivery constraints.",
  "Visualize drivers, pickups, dropoffs, and route geometry on an interactive map.",
  "Measure tradeoffs in total distance, ETA quality, and route behavior across scenarios.",
];

const roadmap = [
  {
    title: "Interactive Route Demo",
    description:
      "Explore scripted Indianapolis-area scenarios, switch algorithms, and inspect route shape, stop order, and distance estimates.",
  },
  {
    title: "Evaluation Workflow",
    description:
      "Run repeatable batch experiments with fixed seeds from either the browser dashboard or the CLI, then export summary artifacts for analysis.",
  },
  {
    title: "Capstone Expansion",
    description:
      "Next milestones focus on playback controls, richer delivery metrics, batching, and fairness-aware dispatch logic.",
  },
];

const stack = ["Next.js App Router", "React 19", "Leaflet", "Vitest", "Seeded Node experiment scripts"];

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
              A web-based simulator for testing how food-delivery routing strategies perform across
              realistic city scenarios, using both baseline distance estimates and road-network
              routing comparisons.
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
              The project emphasizes system design and evaluation rather than inventing a brand-new
              routing algorithm. The goal is to make strategy tradeoffs visible, measurable, and easy
              to explain.
            </div>
          </div>
        </section>

        <section
          id="project-overview"
          className="grid gap-6 rounded-[2rem] border border-stone-900/10 bg-white/75 p-7 shadow-[0_20px_60px_rgba(70,52,24,0.08)] backdrop-blur lg:grid-cols-3"
        >
          {roadmap.map((item) => (
            <article key={item.title} className="rounded-[1.5rem] bg-stone-100/80 p-5">
              <h2 className="text-xl font-semibold tracking-tight text-stone-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700 sm:text-base">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <article className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-7 shadow-[0_20px_60px_rgba(70,52,24,0.08)] backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-700">
              Planned Metrics
            </p>
            <div className="mt-5 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-stone-100/80 p-4">Total route distance and cost proxy</div>
              <div className="rounded-[1.25rem] bg-stone-100/80 p-4">ETA estimates and road-network comparison</div>
              <div className="rounded-[1.25rem] bg-stone-100/80 p-4">On-time performance by scenario</div>
              <div className="rounded-[1.25rem] bg-stone-100/80 p-4">Driver utilization and fairness expansion</div>
            </div>
          </article>

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
            <p className="mt-6 max-w-2xl text-sm leading-6 text-amber-50 sm:text-base">
              The current build already supports scenario-based routing demos and reproducible batch
              experiment generation, which gives us a strong foundation for final capstone polish and
              deeper evaluation.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}

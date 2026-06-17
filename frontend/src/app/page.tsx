export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-between">
        <div className="max-w-3xl pt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-parchment-200">
            Frontend foundation
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#fff8e7] sm:text-6xl">
            ImmanuellaOS is ready for the interface layer.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d8cbd4]">
            Next.js, TypeScript, Tailwind CSS, and the app router are in place.
            The real dashboard, auth screens, and API wiring come next.
          </p>
        </div>

        <div className="grid gap-4 pb-10 sm:grid-cols-3">
          {["App routes", "Components", "API client"].map((item) => (
            <div
              className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              key={item}
            >
              <p className="text-sm font-medium text-parchment-100">{item}</p>
              <p className="mt-2 text-sm text-[#c7b8c3]">Prepared for Phase 5.</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

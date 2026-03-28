export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="mb-3 text-sm font-medium tracking-wide text-brand-700">Printora</p>
        <h1 className="text-4xl font-semibold leading-tight text-gray-900 md:text-5xl">
          Cetak hemat, kualitas hebat
        </h1>
        <p className="mt-4 max-w-2xl text-gray-600">
          Modern online printing untuk bisnis lokal. Simple flow, instant pricing, dan siap dikembangkan.
        </p>
        <div className="mt-8">
          <button
            type="button"
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            Start Order
          </button>
        </div>
      </section>
    </main>
  );
}
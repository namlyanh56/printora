import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-gray-900">Printora</span>
          <Link
            href="/order"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            Start Order
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 text-center md:pt-32">
          <p className="mb-4 inline-block rounded-full border border-brand-100 bg-brand-50 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700">
            Online Printing Service
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-6xl">
            Cetak hemat,{" "}
            <span className="text-brand-600">kualitas hebat.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-500 md:text-lg">
            Order print online tanpa ribet. Upload file, lihat harga langsung, bayar sebentar — semua
            beres.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/order"
              className="rounded-xl bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Start Order →
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-gray-200 px-7 py-3.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
            >
              Lihat Cara Kerja
            </a>
          </div>
        </section>

        {/* ── How it Works ── */}
        <section id="how-it-works" className="border-t border-gray-100 bg-gray-50 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-brand-600">
              How it Works
            </p>
            <h2 className="mb-14 text-center text-2xl font-bold text-gray-900 md:text-3xl">
              Tiga langkah, selesai.
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Isi Data & Upload",
                  desc: "Masukkan nama, alamat, nomor WhatsApp, dan upload file dokumen Anda.",
                },
                {
                  step: "02",
                  title: "Cek Harga",
                  desc: "Sistem menganalisis file dan menampilkan rincian harga transparan sebelum bayar.",
                },
                {
                  step: "03",
                  title: "Bayar & Selesai",
                  desc: "Transfer via QRIS, klik konfirmasi, dan pesanan langsung diproses.",
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="rounded-2xl bg-white p-7 shadow-sm">
                  <p className="mb-3 text-4xl font-black text-brand-100">{step}</p>
                  <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-brand-600">
              Pricing
            </p>
            <h2 className="mb-3 text-center text-2xl font-bold text-gray-900 md:text-3xl">
              Harga jelas, tanpa kejutan.
            </h2>
            <p className="mb-12 text-center text-sm text-gray-500">
              + Biaya bungkus map Rp 500 • Ongkir diatur terpisah via chat
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  label: "Hitam & Putih",
                  tag: "BW",
                  price: "Rp 500",
                  unit: "/ halaman",
                  desc: "Untuk dokumen teks, laporan, atau file tanpa warna.",
                  highlight: false,
                },
                {
                  label: "Warna Ringan",
                  tag: "Color Light",
                  price: "Rp 1.000",
                  unit: "/ halaman",
                  desc: "Dokumen dengan elemen warna tidak dominan.",
                  highlight: true,
                },
                {
                  label: "Warna Penuh",
                  tag: "Full Color",
                  price: "Rp 1.500",
                  unit: "/ halaman",
                  desc: "Presentasi, poster, atau dokumen warna dominan.",
                  highlight: false,
                },
              ].map(({ label, tag, price, unit, desc, highlight }) => (
                <div
                  key={tag}
                  className={`rounded-2xl border p-7 ${
                    highlight
                      ? "border-brand-600 bg-brand-600 text-white shadow-lg"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p
                    className={`mb-1 text-xs font-semibold uppercase tracking-widest ${
                      highlight ? "text-brand-100" : "text-brand-600"
                    }`}
                  >
                    {tag}
                  </p>
                  <h3
                    className={`mb-4 text-lg font-bold ${
                      highlight ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {label}
                  </h3>
                  <p
                    className={`mb-1 text-3xl font-black ${
                      highlight ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {price}
                    <span
                      className={`text-sm font-normal ${
                        highlight ? "text-brand-100" : "text-gray-400"
                      }`}
                    >
                      {unit}
                    </span>
                  </p>
                  <p
                    className={`mt-4 text-sm leading-relaxed ${
                      highlight ? "text-brand-100" : "text-gray-500"
                    }`}
                  >
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Keunggulan ── */}
        <section className="border-t border-gray-100 bg-gray-50 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-brand-600">
              Why Printora
            </p>
            <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 md:text-3xl">
              Kenapa pilih kami?
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {[
                { icon: "⚡", title: "Instant Pricing", desc: "Harga langsung tampil tanpa perlu tanya manual." },
                { icon: "📁", title: "Semua Format Diterima", desc: "PDF, Word, Excel, PowerPoint — semua bisa." },
                { icon: "💸", title: "Harga Terjangkau", desc: "Mulai Rp 500/halaman, jelas dan transparan." },
                { icon: "📱", title: "Mobile Friendly", desc: "Order dari HP kapan saja, di mana saja." },
                { icon: "🔒", title: "Aman & Terpercaya", desc: "Data dan file Anda tersimpan dengan aman." },
                { icon: "💬", title: "Update via WhatsApp", desc: "Notifikasi status pesanan langsung ke WA Anda." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="mb-3 text-2xl">{icon}</p>
                  <h3 className="mb-1 text-sm font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl">
              Siap untuk order?
            </h2>
            <p className="mb-8 text-gray-500">
              Mulai order sekarang — cepat, mudah, dan terjangkau.
            </p>
            <Link
              href="/order"
              className="inline-block rounded-xl bg-gray-900 px-8 py-4 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Start Order →
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 text-center text-sm text-gray-400 sm:flex-row sm:justify-between sm:text-left">
          <span className="font-semibold text-gray-700">Printora</span>
          <span>Cetak hemat, kualitas hebat.</span>
          <span>© {new Date().getFullYear()} Printora</span>
        </div>
      </footer>
    </div>
  );
}
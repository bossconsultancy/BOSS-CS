import { ArrowLeft, ArrowRight, GraduationCap, Megaphone } from "lucide-react";

export const metadata = { title: "Flyers · BOSS Designs" };

const TILES = [
  { href: "/flyers/programs", title: "Education program flyers", icon: GraduationCap },
  { href: "/flyers/general", title: "General flyers", icon: Megaphone },
];

export default function FlyersHome() {
  return (
    <div className="home">
      <header className="home-top">
        <a href="/" className="back-link" title="Back"><ArrowLeft size={18} /></a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-navy.svg" alt="BOSS Consultancy Services" />
      </header>
      <section className="home-hero">
        <h1>Flyers</h1>
      </section>
      <nav className="tiles tiles-2" aria-label="Flyers">
        {TILES.map((t) => (
          <a key={t.href} href={t.href} className="tile">
            <span className="tile-icon">
              <t.icon size={44} strokeWidth={1.7} />
            </span>
            <h2>{t.title}</h2>
            <span className="tile-go" aria-hidden>
              <ArrowRight size={22} strokeWidth={2.2} />
            </span>
          </a>
        ))}
      </nav>
    </div>
  );
}

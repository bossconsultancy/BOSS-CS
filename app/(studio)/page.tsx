import { ArrowRight, BookOpen, FileText, Megaphone, Newspaper } from "lucide-react";

export const metadata = { title: "BOSS Studio", description: "BOSS Consultancy Services design tools" };

const TILES = [
  {
    href: "/news",
    title: "Department news",
    tag: "News",
    icon: Newspaper,
  },
  {
    href: "/social",
    title: "Social media posts",
    tag: "Posts",
    icon: Megaphone,
  },
  {
    href: "/flyers",
    title: "Flyers",
    tag: "Print",
    icon: FileText,
  },
  {
    href: "/booklet",
    title: "Company profile booklet",
    tag: "Print",
    icon: BookOpen,
  },
];

export default function Home() {
  return (
    <div className="home">
      <header className="home-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-navy.svg" alt="BOSS Consultancy Services" />
        <span>Team design studio</span>
      </header>
      <section className="home-hero">
        <h1>What would you like to make?</h1>
        <p>Everything for BOSS social media and print, in one place.</p>
      </section>
      <nav className="tiles" aria-label="BOSS tools">
        {TILES.map((t) => (
          <a key={t.href} href={t.href} className="tile">
            <span className="tile-icon">
              <t.icon size={44} strokeWidth={1.7} />
            </span>
            <h2>{t.title}</h2>
            <span className="tile-go">
              Open <ArrowRight size={16} />
            </span>
          </a>
        ))}
      </nav>
      <footer className="home-foot">
        <a href="tel:+14166050101">416 605 0101</a>
        <a href="https://bosscs.com" target="_blank" rel="noreferrer">bosscs.com</a>
      </footer>
    </div>
  );
}

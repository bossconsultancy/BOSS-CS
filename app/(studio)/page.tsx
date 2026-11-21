import { ArrowRight, BookOpen, FileText, Megaphone, Newspaper } from "lucide-react";

export const metadata = { title: "BOSS Studio", description: "BOSS Consultancy Services design tools" };

const TILES = [
  {
    href: "/news",
    title: "Department news",
    text: "Today's verified news for each department, ready to turn into informative posts and carousels.",
    tag: "News",
    icon: Newspaper,
    dark: true,
  },
  {
    href: "/social",
    title: "Social media posts",
    text: "Type an idea, pick a catchy hook, and get finished posts in English or Tamil.",
    tag: "Posts",
    icon: Megaphone,
  },
  {
    href: "/flyers",
    title: "Flyers",
    text: "Paste course information and get a print-ready program flyer in the BOSS design.",
    tag: "Print",
    icon: FileText,
  },
  {
    href: "/booklet",
    title: "Company profile booklet",
    text: "The 40 page company profile in Tamil and English. Edit any text or photo and download it.",
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
          <a key={t.href} href={t.href} className={`tile${t.dark ? " dark" : ""}`}>
            <span className="tile-tag">{t.tag}</span>
            <span className="tile-icon">
              <t.icon size={26} strokeWidth={1.9} />
            </span>
            <h2>{t.title}</h2>
            <p>{t.text}</p>
            <span className="tile-go">
              Open <ArrowRight size={16} />
            </span>
          </a>
        ))}
      </nav>
      <footer className="home-foot">BOSS Consultancy Services · 416 605 0101 · BOSSCS.COM</footer>
    </div>
  );
}

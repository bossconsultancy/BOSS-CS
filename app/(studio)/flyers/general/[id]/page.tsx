import Booklet from "@/components/Booklet";
import { cloudEnabled, loadGeneral } from "@/lib/cloud";

export const dynamic = "force-dynamic";
export const metadata = { title: "General flyer · BOSS Designs" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = cloudEnabled() && /^[a-z0-9]{4,40}$/i.test(id) ? await loadGeneral(id).catch(() => null) : null;
  return <Booklet doc={{ id, title: r?.doc.name || "Flyer" }} />;
}

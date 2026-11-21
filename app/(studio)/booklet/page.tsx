import Booklet from "@/components/Booklet";

export const metadata = {
  title: "BOSS company profile booklet",
  description: "Edit the 40 page Tamil company profile and download it.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Booklet />;
}

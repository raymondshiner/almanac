import { DiaryPage } from "@/components/diary-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "TV" };

export default function Shows() {
  return <DiaryPage filter="tv" />;
}

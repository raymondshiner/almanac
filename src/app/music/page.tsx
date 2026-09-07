import { DiaryPage } from "@/components/diary-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Music" };

export default function Music() {
  return <DiaryPage filter="album" />;
}

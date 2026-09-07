import { DiaryPage } from "@/components/diary-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Film" };

export default function Movies() {
  return <DiaryPage filter="film" />;
}

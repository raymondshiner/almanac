import { DiaryPage } from "@/components/diary-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Books" };

export default function Books() {
  return <DiaryPage filter="book" />;
}

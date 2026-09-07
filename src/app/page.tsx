import { DiaryPage } from "@/components/diary-page";

export const dynamic = "force-dynamic";

export default function Home() {
  return <DiaryPage filter="all" />;
}

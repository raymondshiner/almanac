import { DiaryPage } from "@/components/diary-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Games" };

export default function Games() {
  return <DiaryPage filter="game" />;
}

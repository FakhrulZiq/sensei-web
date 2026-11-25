import { notFound } from "next/navigation";
import Dashboard from "../workspace";
import { isScreen, screenIds } from "../_workspace/navigation";

export function generateStaticParams() {
  return screenIds.filter((screen) => screen !== "summary").map((screen) => ({ screen }));
}

export default async function WorkspacePage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!isScreen(screen)) notFound();
  return <Dashboard initialScreen={screen} />;
}

import { notFound } from "next/navigation";
import { TourExperience } from "@/components/tour";
import { tour, tourScene } from "@/lib/tour";
export const dynamic = "force-dynamic";
export default async function HotspotPicker({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  const id = typeof query.diem === "string" ? query.diem : undefined;
  return (
    <main>
      <TourExperience
        configuration={tour}
        initialId={tourScene(id).id}
        locale="vi"
        workshopHref="/workshop"
        picker
      />
    </main>
  );
}

import OutletList from "./OutletList";
import { listActiveOutlets } from "@/server/services/outlets";

export default async function OutletDirectory() {
  const outlets = await listActiveOutlets();
  return outlets.length > 0 ? <OutletList outlets={outlets} /> : (
    <p className="border-t border-pasir py-12 text-seduh-soft">
      Belum ada outlet yang tersedia. Kabar lokasi terbaru akan hadir di sini.
    </p>
  );
}

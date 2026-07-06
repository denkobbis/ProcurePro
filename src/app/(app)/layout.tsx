import { getCurrentProfile } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { MobileNavProvider } from "@/components/MobileNavContext";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <MobileNavProvider>
      <div className="flex min-h-screen w-full">
        <div className="print:hidden">
          <Sidebar profile={profile} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden">
            <Header profile={profile} />
          </div>
          <main className="flex-1 bg-zinc-50 p-4 sm:p-6 print:bg-white print:p-0">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}

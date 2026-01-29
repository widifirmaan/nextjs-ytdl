
import Downloader from "@/components/Downloader";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white flex flex-col items-center justify-center p-4 selection:bg-red-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <div className="z-10 w-full">
        <Downloader />
      </div>

      <footer className="mt-16 text-gray-500 text-sm z-10 text-center">
        <p>Made for educational purposes only.</p>
      </footer>
    </main>
  );
}

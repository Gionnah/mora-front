import Carousel from "@/components/Carousel";
import CameraPanel from "@/components/CameraPanel";
import Logo from "@/components/Logo";
import SidePanel from "@/components/SidePanel";

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <header className="pointer-events-none absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 rounded-full bg-ink/70 px-3 py-2 shadow-lg backdrop-blur-md">
        <Logo />
      </header>

      <div className="h-full min-h-0">
        {/* Le bloc du milieu (index 1) est le plus grand. Les deux autres sont à définir. */}
        <Carousel labels={["Bloc gauche", "Caméra", "Bloc droit"]}>
          <SidePanel title="Bloc gauche" />
          <CameraPanel />
          <SidePanel title="Bloc droit" />
        </Carousel>
      </div>
    </main>
  );
}
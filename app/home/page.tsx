import Carousel from "@/components/Carousel";
import CameraPanel from "@/components/CameraPanel";
import Logo from "@/components/Logo";
import SidePanel from "@/components/SidePanel";

export default function Home() {
  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex flex-none justify-start px-[clamp(16px,3vw,40px)] pb-0 pt-[clamp(12px,2vh,20px)] [@media(max-height:520px)]:pt-2">
        <Logo />
      </header>

      <div className="min-h-0 flex-1">
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
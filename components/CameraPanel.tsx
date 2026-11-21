"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

type Mode = "idle" | "camera" | "file";
type Facing = "user" | "environment";

/* ---------- Classes Tailwind ---------- */

const BTN =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[14px] px-4 " +
  "text-[0.92rem] font-semibold transition duration-150 enabled:active:scale-[0.97] " +
  "disabled:cursor-progress disabled:opacity-55 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const BTN_PRIMARY = `${BTN} flex-[1_1_100%] bg-lime text-ink hover:enabled:brightness-95`;
const BTN_SECONDARY = `${BTN} min-w-0 flex-1 text-ink ring-[1.5px] ring-inset ring-ink/55 hover:bg-ink/10`;
const BTN_ICON = `${BTN} w-[46px] flex-none bg-ink/10 px-0 text-ink hover:enabled:bg-ink/15`;

function describeError(error: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "La caméra nécessite une connexion sécurisée (HTTPS) ou localhost.";
  }
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Accès à la caméra refusé. Autorisez-le dans les réglages du navigateur.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Aucune caméra compatible détectée.";
    case "NotReadableError":
    case "AbortError":
      return "La caméra est déjà utilisée par une autre application.";
    default:
      return "Impossible de démarrer la caméra.";
  }
}

export default function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [mode, setMode] = useState<Mode>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  // Coupe la caméra quand le composant disparaît.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // Libère l'URL de la vidéo importée dès qu'elle change ou à la fermeture.
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Branche le flux de la caméra sur l'élément <video>.
  useEffect(() => {
    const video = videoRef.current;
    if (mode !== "camera" || !video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [mode, stream]);

  const startCamera = useCallback(
    async (nextFacing: Facing) => {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext
            ? "Votre navigateur ne prend pas en charge la caméra."
            : describeError(null),
        );
        return;
      }
      setBusy(true);
      // Sur mobile, il faut libérer la caméra actuelle avant d'ouvrir l'autre.
      stopStream();
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: nextFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!mountedRef.current) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setFacing(nextFacing);
        setFileUrl(null);
        setMode("camera");
      } catch (err) {
        if (mountedRef.current) {
          setMode("idle");
          setError(describeError(err));
        }
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [stopStream],
  );

  const toggleCamera = useCallback(() => {
    if (mode === "camera") {
      stopStream();
      setMode("idle");
      return;
    }
    void startCamera(facing);
  }, [mode, facing, startCamera, stopStream]);

  const flipCamera = useCallback(() => {
    void startCamera(facing === "user" ? "environment" : "user");
  }, [facing, startCamera]);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        setError("Ce fichier n'est pas une vidéo.");
        return;
      }
      stopStream();
      setError(null);
      setFileUrl(URL.createObjectURL(file));
      setFileName(file.name);
      setMode("file");
    },
    [stopStream],
  );

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = ""; // permet de re-sélectionner le même fichier
  };

  const removeFile = () => {
    setFileUrl(null);
    setFileName("");
    setMode("idle");
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const pillLabel =
    mode === "camera" ? "En direct" : mode === "file" ? fileName || "Vidéo importée" : "Caméra éteinte";

  return (
    <section
      aria-label="Caméra"
      className="flex h-full min-h-0 flex-col gap-3.5 p-[clamp(14px,2.2vw,22px)]"
    >
      <header className="flex flex-none items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.35rem] font-semibold italic tracking-tight">Caméra</h2>
        <p className="text-[0.78rem] opacity-60">Direct ou import</p>
      </header>

      {/* Écran d'affichage */}
      <div
        data-dragging={dragging}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="relative isolate grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[20px] bg-ink text-cream outline-2 -outline-offset-8 outline-dashed outline-transparent transition-[outline-color] duration-200 data-[dragging=true]:outline-lime"
      >
        {mode !== "idle" ? (
          <video
            key={mode}
            ref={videoRef}
            data-mirror={mode === "camera" && facing === "user"}
            data-fit={mode === "file" ? "contain" : "cover"}
            src={mode === "file" ? (fileUrl ?? undefined) : undefined}
            controls={mode === "file"}
            autoPlay={mode === "camera"}
            muted={mode === "camera"}
            playsInline
            aria-label={mode === "camera" ? "Aperçu de la caméra" : "Vidéo importée"}
            className="absolute inset-0 size-full bg-black object-cover data-[fit=contain]:object-contain data-[mirror=true]:-scale-x-100"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-6 text-center">
            <span className="mb-1.5 grid size-15 place-items-center rounded-full border-[1.5px] border-cream/30 text-cream/80">
              <CameraIcon />
            </span>
            <p className="text-base font-semibold">Aucune image</p>
            <p className="max-w-[24ch] text-[0.82rem] text-cream/65">
              Activez la caméra ou importez une vidéo.
            </p>
          </div>
        )}

        {/* Pastille d'état */}
        <div className="absolute left-3 top-3 z-2 inline-flex max-w-[calc(100%-24px)] items-center gap-2 rounded-full bg-ink/70 px-2.75 py-1.5 text-xs text-cream backdrop-blur-md">
          <span
            data-live={mode === "camera"}
            className="size-2 flex-none rounded-full bg-cream/50 data-[live=true]:animate-pulse data-[live=true]:bg-orange motion-reduce:animate-none"
          />
          <span className="truncate">{pillLabel}</span>
        </div>

        {error ? (
          <p
            role="alert"
            className="absolute inset-x-3 bottom-3 z-3 rounded-xl border-l-[3px] border-orange bg-ink/95 px-3 py-2.5 text-[0.82rem] leading-snug text-cream"
          >
            {error}
          </p>
        ) : null}
      </div>

      {/* Commandes */}
      <div className="flex flex-none flex-wrap gap-2.5">
        <button type="button" className={BTN_PRIMARY} onClick={toggleCamera} disabled={busy}>
          <CameraIcon size={18} />
          {mode === "camera" ? "Arrêter la caméra" : busy ? "Démarrage…" : "Activer la caméra"}
        </button>

        <button
          type="button"
          className={BTN_SECONDARY}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          {mode === "file" ? "Changer de vidéo" : "Importer une vidéo"}
        </button>

        {mode === "camera" ? (
          <button
            type="button"
            className={BTN_ICON}
            onClick={flipCamera}
            disabled={busy}
            aria-label="Changer de caméra"
            title="Changer de caméra"
          >
            <FlipIcon />
          </button>
        ) : null}

        {mode === "file" ? (
          <button
            type="button"
            className={BTN_ICON}
            onClick={removeFile}
            aria-label="Retirer la vidéo"
            title="Retirer la vidéo"
          >
            <CloseIcon />
          </button>
        ) : null}

        <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={onPickFile} />
      </div>
    </section>
  );
}

/* ---------- Icônes ---------- */

type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function CameraIcon({ size = 28 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.1a1 1 0 0 0 .8-.4l.7-1A1 1 0 0 1 10 4.2h4a1 1 0 0 1 .9.4l.7 1a1 1 0 0 0 .8.4h1.1A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </Svg>
  );
}

function UploadIcon() {
  return (
    <Svg size={18}>
      <path d="M12 16V5m0 0L8 9m4-4 4 4M5 19h14" />
    </Svg>
  );
}

function FlipIcon() {
  return (
    <Svg size={20}>
      <path d="M4 9a8 8 0 0 1 14-3l2 2M20 15a8 8 0 0 1-14 3l-2-2M20 4v4h-4M4 20v-4h4" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg size={20}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
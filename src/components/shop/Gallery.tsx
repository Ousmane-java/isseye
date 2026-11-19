"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import type { MediaView } from "@/lib/catalog-types";

/**
 * Galerie de la fiche produit. Ordinateur : photos empilées, loupe qui suit la souris.
 * Mobile : carrousel au doigt avec indicateur.
 */
export function Gallery({ media, name }: { media: MediaView[]; name: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const items = media.length ? media : [{ url: "/images/monogramme.png", alt: name, kind: "image" as const, poster: null }];

  return (
    <div>
      {/* Mobile */}
      <div className="relative -mx-4 sm:-mx-8 lg:hidden">
        <div
          ref={track}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        >
          {items.map((m, i) => (
            <div key={m.url + i} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-lin">
              <MediaItem media={m} priority={i === 0} sizes="100vw" />
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {items.map((m, i) => (
              <button
                key={m.url + i}
                onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
                className={clsx("h-1 rounded-full transition-all duration-500", i === index ? "w-8 bg-noir" : "w-3 bg-noir/25")}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ordinateur */}
      <div className="hidden space-y-4 lg:block">
        {items.map((m, i) => (
          <motion.div
            key={m.url + i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
          >
            {m.kind === "video" ? (
              <div className="relative aspect-[4/5] bg-lin">
                <MediaItem media={m} sizes="55vw" />
              </div>
            ) : (
              <Zoom media={m} priority={i === 0} />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MediaItem({ media, priority, sizes }: { media: MediaView; priority?: boolean; sizes: string }) {
  if (media.kind === "video") {
    return <video src={media.url} poster={media.poster ?? undefined} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />;
  }
  return <Image src={media.url} alt={media.alt} fill priority={priority} sizes={sizes} quality={90} className="object-cover" />;
}

function Zoom({ media, priority }: { media: MediaView; priority?: boolean }) {
  const [origin, setOrigin] = useState("50% 50%");
  const [zoomed, setZoomed] = useState(false);
  return (
    <div
      className="relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-lin"
      onPointerEnter={() => setZoomed(true)}
      onPointerLeave={() => setZoomed(false)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      <Image
        src={media.url}
        alt={media.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 55vw, 100vw"
        quality={90}
        style={{ transformOrigin: origin }}
        className={clsx("object-cover transition-transform duration-700 ease-(--ease-luxe)", zoomed && "scale-[1.6]")}
      />
    </div>
  );
}

import type { CSSProperties } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { getMenu } from "@/lib/menus";
import { getSettings } from "@/lib/settings";
import { getVisitorCurrency } from "@/lib/currencies";
import { getAnnouncements } from "@/lib/content";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [header, footer, settings, currency, announcements] = await Promise.all([getMenu("header"), getMenu("footer"), getSettings(), getVisitorCurrency(), getAnnouncements()]);
  const bar = announcements.bar?.content.text ? announcements.bar : null;
  const currencyLabel = `Prix en ${currency.symbol}`;
  // Clé du bandeau : s'il change (autre annonce ou autre texte), il réapparaît même après avoir été fermé
  const barKey = bar ? `${bar.id}:${bar.content.text}` : "";
  return (
    // --bar-h : hauteur du bandeau d'annonce, pour décaler le haut des pages
    <div id="site-shell" style={{ "--bar-h": bar ? "2.25rem" : "0px" } as CSSProperties}>
      {bar && (
        // Bandeau déjà fermé par la visiteuse : masqué avant l'affichage, sans clignement
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("isseye-bandeau")===${JSON.stringify(barKey).replace(/</g, "\\u003c")}){var s=document.getElementById("site-shell");s.style.setProperty("--bar-h","0px");s.dataset.barClosed="1"}}catch(e){}`,
          }}
        />
      )}
      <SmoothScroll />
      <Header items={header} currencyLabel={currencyLabel} bar={bar} barKey={barKey} />
      <main>{children}</main>
      <Footer items={footer} settings={settings} currencyLabel={currencyLabel} />
      <CartDrawer />
      {announcements.popup && <AnnouncementPopup popup={announcements.popup} />}
    </div>
  );
}

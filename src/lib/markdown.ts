// Texte riche saisi dans l'admin (descriptions, pages légales) → HTML sûr.
// Markdown volontairement réduit : titres (## et ###), listes (- et 1.), **gras**, *italique*,
// [liens](https://…) et paragraphes. Tout le HTML saisi est échappé.

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text: string) {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:|tel:)[^)\s]+)\)/g, (_, label: string, href: string) => {
      const external = /^https?:\/\//.test(href);
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
    });
}

export function markdownToHtml(source: string | null | undefined) {
  if (!source) return "";
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    const bullet = /^[-•*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);

    if (!line) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const tag = heading[1].length === 2 ? "h2" : "h3";
      out.push(`<${tag}>${inline(heading[2])}</${tag}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return out.join("\n");
}

/** Remplace les variables {{nom}} d'un texte (emails, pages légales). Valeurs échappées si `html`. */
export function fillTemplate(text: string, vars: Record<string, string | number | null | undefined>, html = false) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return match;
    return html ? escape(String(value)) : String(value);
  });
}

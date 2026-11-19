import { test } from "node:test";
import assert from "node:assert/strict";
import { fillTemplate, markdownToHtml } from "./markdown.ts";

test("titres, paragraphes, listes et mise en forme", () => {
  const html = markdownToHtml("## Livraison\nNous livrons **partout**.\n\n- France\n- Sénégal\n\n1. Un\n2. Deux");
  assert.equal(html, "<h2>Livraison</h2>\n<p>Nous livrons <strong>partout</strong>.</p>\n<ul><li>France</li><li>Sénégal</li></ul>\n<ol><li>Un</li><li>Deux</li></ol>");
});

test("le HTML saisi est échappé, seuls les liens sûrs sont actifs", () => {
  assert.equal(markdownToHtml("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.equal(markdownToHtml("[CGV](/cgv)"), '<p><a href="/cgv">CGV</a></p>');
  assert.equal(markdownToHtml("[x](javascript:alert(1))"), "<p>[x](javascript:alert(1))</p>");
  assert.match(markdownToHtml("[Site](https://isseye.com)"), /target="_blank"/);
});

test("variables des modèles", () => {
  assert.equal(fillTemplate("Merci {{prenom}}, commande {{numero}}", { prenom: "Awa", numero: "ISY-1001" }), "Merci Awa, commande ISY-1001");
  assert.equal(fillTemplate("{{prenom}} {{inconnue}}", { prenom: "<b>" }, true), "&lt;b&gt; {{inconnue}}");
});

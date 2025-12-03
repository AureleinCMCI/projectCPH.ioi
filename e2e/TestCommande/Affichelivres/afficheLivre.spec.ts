import { test, expect } from '@playwright/test';

test('mesure poids images modal "Liste des livres disponibles à la vente"', async ({ page }) => {
  // Auth rapide par injection JWT
  await page.addInitScript(() => {
    try {
      localStorage.setItem('jwt', 'test_jwt_token');
    } catch (e) {}
  });

  // Stocke les tailles d’images
  const imagesSizes: { url: string; size: number }[] = [];

  // Observe toutes les réponses réseau images (jpg, png, etc)
  page.on('response', async response => {
    const url = response.url();
    // Filtre les images associées à la modal (adapte le pattern SRC selon ton app)
    if (url.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/) && url.includes('/public/cover/')) {
      try {
        const buffer = await response.body();
        const size = buffer.length;
        imagesSizes.push({ url, size });
        console.log(`[image] ${url} => ${(size / 1024).toFixed(2)} KB`);
        // Assertion : par exemple, taille < 500ko
        expect(size).toBeLessThan(500 * 1024);
      } catch (e) {
        console.warn(`Erreur récupérer image : ${url}`);
      }
    }
  });

  // Charge la page commande déjà "loggué"
  await page.goto('http://localhost:3000/commande', { waitUntil: 'networkidle' });

  // Ouvre la modale "Vendre"
  await page.click('text=Vendre');
  await page.locator('text=Liste des livres disponibles à la vente').waitFor({ state: 'visible' });

  // Attends que des images soient chargées dans la modal
  await page.waitForSelector('.transactionInfo img');

  // Vérifie qu’au moins une image a été enregistrée
  expect(imagesSizes.length).toBeGreaterThan(0);

  // Résumé console
  console.log('\n[perf] Images dans la modal :');
  imagesSizes.forEach(({ url, size }) => {
    console.log(`- ${url} => ${(size / 1024).toFixed(2)} KB`);
  });
});

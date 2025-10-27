import { test, expect } from '@playwright/test';

test('tester le formulaire d\'inscription et de connexion', async ({ page }) => {
  // Logger les erreurs console et réseau
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('response', async response => {
    if (!response.ok()) {
      console.log(`API Error ${response.status()}: ${response.url()}`);
    }
  });

  // Aller sur la page de connexion
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Cliquer sur le bouton "Sign Up" pour afficher le formulaire d'inscription
  await page.click('button:has-text("Sign Up")');
  
  // Attendre que le formulaire soit visible
  await page.waitForSelector('input[placeholder="Prenom"]');

  // Remplir le formulaire d'inscription
  await page.fill('input[placeholder="Prenom"]', 'TestUser');
  await page.fill('input[placeholder="Mot de passe"]', 'password123');

  // Soumettre le formulaire et attendre la navigation
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth') && response.status() === 200),
    page.click('button[type="submit"]')
  ]);

  // Vérifier la redirection avec retry
  try {
    await expect(page).toHaveURL(/acceuil/, { timeout: 15000 });
  } catch (e) {
    console.log('URL actuelle:', page.url());
    console.log('Tentative de connexion alternative...');

    // Si pas redirigé, essayer de se connecter
    await page.fill('input[placeholder="Prenom"]', 'TestUser');
    await page.fill('input[placeholder="Mot de passe"]', 'password123');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }),
      page.click('button:has-text("Se connecter")')
    ]);
  }

  // Vérification finale
  await expect(page).toHaveURL(/acceuil/);
});
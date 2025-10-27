import { test, expect } from '@playwright/test';


test('tester le formulaire  connexion', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

   
  // Remplir le formulaire d'inscription
  await page.fill('input[placeholder="Name"]', 'TestUser');
  await page.fill('input[placeholder="Password"]', 'password123');
  await page.click('button:has-text("connexion")');
  await expect(page).toHaveURL(/acceuil/);
});
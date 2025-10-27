import { test, expect } from '@playwright/test';

test('mesure latence modal "Liste des livres disponibles à la vente" et pagination (seulement partie commande)', async ({ page }) => {
    // Contourner l'auth : injecter JWT dans localStorage avant tout chargement
    await page.addInitScript(() => {
        try {
            localStorage.setItem('jwt', 'test_jwt_token');
        } catch (e) { /* ignore */ }
    });

    // Collecte des métriques réseau pour /api/inventaire
    const startMap = new Map<string, number>();
    const responses: { url: string; duration: number; size: number }[] = [];

    page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/inventaire')) {
            startMap.set(url, Date.now());
        }
    });

    page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api/inventaire')) {
            const start = startMap.get(url) ?? Date.now();
            const duration = Date.now() - start;
            let size = 0;
            try {
                const body = await response.body();
                size = body ? body.length : 0;
            } catch (e) {
                // some responses may not expose body; ignore size
            }
            responses.push({ url, duration, size });
            console.log(`[perf] ${url} -> ${duration}ms, ${(size/1024).toFixed(2)} KB`);
        }
    });

    // Aller sur la page commande (page déjà "connectée" via addInitScript)
    await page.goto('http://localhost:3000/commande', { waitUntil: 'networkidle' });

    // Ouvrir la modale "Vendre" et mesurer le temps d'affichage de la liste
    const modalTitleLocator = page.locator('text=Liste des livres disponibles à la vente');
    const clickStart = Date.now();
    await page.click('text=Vendre');
    await modalTitleLocator.waitFor({ state: 'visible', timeout: 10000 });
    const modalOpenTime = Date.now() - clickStart;
    console.log(`[perf] Modal opened in ${modalOpenTime}ms`);
    expect(modalOpenTime).toBeLessThan(5000); // seuil large, ajuster si nécessaire

    // Attendre qu'au moins une requête inventaire soit enregistrée après ouverture
    await page.waitForResponse(response => response.url().includes('/api/inventaire'), { timeout: 10000 });

    // Vérifier liste des ventes présente dans la modal (scoped locator)
    const modalRoot = modalTitleLocator.locator('..'); // titre -> parent (simple scope)
    const ventesList = page.locator('.transaction');
    await expect(ventesList.first()).toBeVisible();

    // Récupérer pagination à l'intérieur de la modal
    const pagination = page.locator('.mantine-Pagination-root').first();
    await expect(pagination).toBeVisible();

    // Récupérer labels de boutons numériques de pagination (ex: "1","2","3"...)
    const btns = await pagination.locator('button').allTextContents();
    const pageNumbers = btns
        .map(t => t.trim())
        .filter(t => /^\d+$/.test(t))
        .map(Number)
        .filter(n => !Number.isNaN(n));

    // Si pas de pagination numérique trouvée, essayer de détecter nombre de pages via attributs ou fallback 1
    const pagesToTest = pageNumbers.length > 0 ? Array.from(new Set(pageNumbers)).sort((a,b)=>a-b) : [1];

    // Pour chaque page de la modal, mesurer latence de la requête /api/inventaire?page=X et temps d'affichage minimal
    const perPageResults: { page: number; apiLatencyMs?: number; modalRenderMs?: number }[] = [];

    for (const pNum of pagesToTest) {
        const apiUrlFragment = `page=${pNum}`;
        // Mesurer temps entre click et réponse API correspondant
        const pageClickStart = Date.now();
        // Cliquer sur le bouton de page dans la pagination (scoped)
        const btn = pagination.getByRole('button', { name: String(pNum) });
        await btn.click();

        // Attendre la réponse API pour cette page
        const apiResp = await page.waitForResponse(resp =>
            resp.url().includes('/api/inventaire') && resp.url().includes(apiUrlFragment), { timeout: 10000 }
        );
        const apiLatency = Date.now() - pageClickStart;

        // Optionnel : attendre que la liste dans la modal soit stabilisée (au moins 1 item visible)
        const renderStart = Date.now();
        await ventesList.first().waitFor({ state: 'visible', timeout: 10000 });
        const renderMs = Date.now() - renderStart;

        // Try to get recorded response duration if captured earlier
        const recorded = responses.find(r => r.url.includes(apiUrlFragment));
        const recordedLatency = recorded ? recorded.duration : undefined;
        console.log(`[perf] page=${pNum} click->response ${apiLatency}ms, recorded API=${recordedLatency ?? 'n/a'}ms, render=${renderMs}ms`);

        // Assertions: ajustez seuils si nécessaire
        expect(apiLatency).toBeLessThan(5000); // API should respond within 5s for test environment
        expect(renderMs).toBeLessThan(3000); // rendering should be reasonably quick

        perPageResults.push({ page: pNum, apiLatencyMs: recordedLatency ?? apiLatency, modalRenderMs: renderMs });
    }

    // Résumé console
    console.log('\n[perf] Summary per-page:');
    perPageResults.forEach(r => {
        console.log(`- page ${r.page}: api=${r.apiLatencyMs ?? 'n/a'}ms, render=${r.modalRenderMs ?? 'n/a'}ms`);
    });

    // Vérification finale : au moins une page mesurée
    expect(perPageResults.length).toBeGreaterThan(0);
});
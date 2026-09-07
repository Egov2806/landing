(() => {
    "use strict";

    const STORAGE_KEY = "bespalova.cart.slugs";

    function uniqueSlugs(values) {
        const seen = new Set();
        const result = [];
        (values || []).forEach((raw) => {
            const slug = String(raw || "").trim().toLowerCase();
            if (!slug || seen.has(slug)) {
                return;
            }
            seen.add(slug);
            result.push(slug);
        });
        return result;
    }

    function getSlugs() {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
            return uniqueSlugs(Array.isArray(parsed) ? parsed : []);
        } catch (_error) {
            return [];
        }
    }

    function setSlugs(values) {
        const slugs = uniqueSlugs(values);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
        return slugs;
    }

    function hydrate(catalogItems) {
        const bySlug = new Map(
            (catalogItems || []).map((item) => [
                String(item.slug || "").toLowerCase(),
                item
            ])
        );
        const next = [];
        let removed = false;
        getSlugs().forEach((slug) => {
            const live = bySlug.get(slug);
            if (!live || !live.is_purchasable) {
                removed = true;
                return;
            }
            next.push({
                id: live.slug,
                title: live.title,
                price: Number(live.price_kopecks || 0) / 100,
                quantity: 1
            });
        });
        setSlugs(next.map((row) => row.id));
        return { items: next, removed };
    }

    window.BespalovaCartStore = Object.freeze({
        getSlugs,
        setSlugs,
        add(slug) {
            return setSlugs(getSlugs().concat(slug));
        },
        remove(slug) {
            const target = String(slug || "").trim().toLowerCase();
            return setSlugs(getSlugs().filter((item) => item !== target));
        },
        clear() {
            return setSlugs([]);
        },
        hydrate
    });
})();

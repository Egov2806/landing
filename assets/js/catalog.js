(() => {
    "use strict";

    const FEATURED_BADGES = new Set([
        "БЕСТСЕЛЛЕР",
        "ХИТ",
        "РЕКОМЕНДУЮ",
        "МАКСИМУМ"
    ]);

    const FALLBACK_TAB = "checkup";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function tabFor(item) {
        return item && item.tab ? String(item.tab) : FALLBACK_TAB;
    }

    function setPanelMessage(panel, message) {
        panel.innerHTML =
            `<p class="catalog-empty">${escapeHtml(message)}</p>`;
    }

    function renderCard(item, index) {
        const featured = FEATURED_BADGES.has(item.badge || "");
        const number = String(index + 1).padStart(2, "0");
        const category = item.category
            ? `<span class="product-category">${escapeHtml(item.category)}</span>`
            : "";
        const badge = item.badge
            ? `<span class="product-badge">${escapeHtml(item.badge)}</span>`
            : "";
        const features = (item.features || [])
            .map((line) => `<li>${escapeHtml(line)}</li>`)
            .join("");
        const featureList = features ? `<ul>${features}</ul>` : "";
        const price = escapeHtml(item.formatted_price || "");
        const button = item.is_purchasable
            ? `<button data-add="${escapeHtml(item.slug)}" type="button">В КОРЗИНУ <span>⟶</span></button>`
            : `<button type="button" disabled>НЕДОСТУПНО</button>`;

        return `
<article class="product-card${featured ? " featured" : ""} reveal visible">
  <div class="product-top">${category}${badge}</div>
  <span class="product-number">${number}</span>
  <h3>${escapeHtml(item.title || "")}</h3>
  <p>${escapeHtml(item.short_description || "")}</p>
  ${featureList}
  <div class="product-bottom"><strong>${price}</strong>${button}</div>
</article>`;
    }

    function bindCartButtons(root, itemsBySlug) {
        root.querySelectorAll("[data-add]").forEach((button) => {
            button.addEventListener("click", () => {
                const store = window.BespalovaStore;
                const cartStore = window.BespalovaCartStore;
                const item = itemsBySlug[button.dataset.add];
                if (!store || !cartStore || !item || !item.is_purchasable) {
                    return;
                }
                cartStore.add(item.slug);
                const hydrated = cartStore.hydrate(Object.values(itemsBySlug));
                store.cart.splice(0, store.cart.length, ...hydrated.items);
                store.updateCart();
                store.openCart();
            });
        });
    }

    function syncCart(items) {
        const store = window.BespalovaStore;
        const cartStore = window.BespalovaCartStore;
        if (!store || !cartStore || !Array.isArray(store.cart)) {
            return;
        }
        const hydrated = cartStore.hydrate(items);
        store.cart.splice(0, store.cart.length, ...hydrated.items);
        if (hydrated.removed && typeof store.notify === "function") {
            store.notify("Некоторые позиции больше недоступны для покупки и удалены из корзины.");
        }
        store.updateCart();
    }

    function renderCatalog(items) {
        const panels = document.querySelectorAll("[data-catalog-tab]");
        const grouped = {};
        items.forEach((item) => {
            const tab = tabFor(item);
            grouped[tab] = grouped[tab] || [];
            grouped[tab].push(item);
        });

        const itemsBySlug = {};
        items.forEach((item) => {
            itemsBySlug[item.slug] = item;
        });

        panels.forEach((panel) => {
            const tab = panel.getAttribute("data-catalog-tab");
            const tabItems = grouped[tab] || [];
            if (!tabItems.length) {
                setPanelMessage(panel, "В этой категории пока нет опубликованных продуктов.");
                return;
            }
            panel.innerHTML = tabItems
                .map((item, index) => renderCard(item, index))
                .join("");
            bindCartButtons(panel, itemsBySlug);
        });

        syncCart(items);
    }

    function renderUnavailable() {
        document.querySelectorAll("[data-catalog-tab]").forEach((panel) => {
            setPanelMessage(
                panel,
                "Каталог временно недоступен. Покупка приостановлена."
            );
        });
        const store = window.BespalovaStore;
        if (store && Array.isArray(store.cart)) {
            store.cart.splice(0, store.cart.length);
            store.updateCart();
        }
    }

    async function loadCatalog() {
        try {
            const response = await fetch("/api/v1/catalog", {
                method: "GET",
                credentials: "same-origin",
                mode: "same-origin",
                cache: "no-store",
                redirect: "error",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("catalog_http");
            }

            const payload = await response.json();
            const items = Array.isArray(payload?.items) ? payload.items : [];
            renderCatalog(items);
        } catch (_error) {
            renderUnavailable();
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadCatalog();
    });
})();

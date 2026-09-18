(() => {
    "use strict";

    const FEATURED_BADGES = new Set([
        "БЕСТСЕЛЛЕР",
        "ХИТ",
        "РЕКОМЕНДУЮ",
        "МАКСИМУМ"
    ]);

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function gridClass(count) {
        if (count === 1) {
            return "product-grid product-grid-single";
        }
        if (count === 2) {
            return "product-grid product-grid-two";
        }
        return "product-grid";
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

    function bindTabButtons(root) {
        root.querySelectorAll(".tab-button").forEach((button) => {
            button.addEventListener("click", () => {
                const selected = button.dataset.tab;
                root.querySelectorAll(".tab-button").forEach((item) => {
                    const active = item === button;
                    item.classList.toggle("active", active);
                    item.setAttribute("aria-selected", String(active));
                });
                document.querySelectorAll("[data-catalog-panels] .tab-panel").forEach((panel) => {
                    const active = panel.id === `panel-${selected}`;
                    panel.classList.toggle("active", active);
                    panel.hidden = !active;
                    if (active) {
                        panel.querySelectorAll(".reveal").forEach((item) => {
                            item.classList.add("visible");
                        });
                    }
                });
            });
        });
    }

    function renderSections(sections) {
        const tabs = document.querySelector("[data-catalog-tabs]");
        const panels = document.querySelector("[data-catalog-panels]");
        if (!tabs || !panels) {
            return [];
        }
        if (!sections.length) {
            tabs.innerHTML = "";
            panels.innerHTML =
                '<p class="catalog-empty">В каталоге пока нет опубликованных продуктов.</p>';
            return [];
        }
        tabs.innerHTML = sections.map((section, index) => {
            const slug = escapeHtml(section.slug || "");
            const title = escapeHtml(section.title || section.slug || "");
            const active = index === 0;
            return `<button aria-selected="${active ? "true" : "false"}" class="tab-button${active ? " active" : ""}" data-tab="${slug}" role="tab" type="button">${title}</button>`;
        }).join("");
        panels.innerHTML = sections.map((section, index) => {
            const slug = escapeHtml(section.slug || "");
            const active = index === 0;
            return `<div class="tab-panel${active ? " active" : ""}" id="panel-${slug}" role="tabpanel"${active ? "" : " hidden"}><div class="product-grid" data-catalog-tab="${slug}"></div></div>`;
        }).join("");
        bindTabButtons(tabs);
        return sections;
    }

    function renderCatalog(payload) {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const sections = Array.isArray(payload?.sections) ? payload.sections : [];
        renderSections(sections);

        const grouped = {};
        items.forEach((item) => {
            const tab = item && item.tab ? String(item.tab) : "";
            if (!tab) {
                return;
            }
            grouped[tab] = grouped[tab] || [];
            grouped[tab].push(item);
        });

        const itemsBySlug = {};
        items.forEach((item) => {
            itemsBySlug[item.slug] = item;
        });

        document.querySelectorAll("[data-catalog-tab]").forEach((panel) => {
            const tab = panel.getAttribute("data-catalog-tab");
            const tabItems = grouped[tab] || [];
            panel.className = gridClass(tabItems.length);
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
        const tabs = document.querySelector("[data-catalog-tabs]");
        const panels = document.querySelector("[data-catalog-panels]");
        if (tabs) {
            tabs.innerHTML = "";
        }
        if (panels) {
            panels.innerHTML =
                '<p class="catalog-empty">Каталог временно недоступен. Покупка приостановлена.</p>';
        }
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
            renderCatalog(payload);
        } catch (_error) {
            renderUnavailable();
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadCatalog();
    });
})();

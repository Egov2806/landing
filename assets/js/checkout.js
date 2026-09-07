(() => {
    "use strict";

    const money = new Intl.NumberFormat("ru-RU");
    const IDEMPOTENCY_KEY = "bespalova.checkout.idempotency";
    const CONSENT_VERSION = "3.1";

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function ensureIdempotencyKey() {
        const existing = sessionStorage.getItem(IDEMPOTENCY_KEY);
        if (existing && existing.length >= 16) {
            return existing;
        }
        const next = crypto.randomUUID();
        sessionStorage.setItem(IDEMPOTENCY_KEY, next);
        return next;
    }

    function setMessage(text, isError) {
        const box = document.getElementById("checkoutMessage");
        if (!box) {
            return;
        }
        box.className = isError ? "checkout-message error" : "checkout-message";
        box.textContent = text;
    }

    function renderItems(items) {
        const list = document.getElementById("checkoutItems");
        const totalNode = document.getElementById("checkoutTotal");
        if (!list || !totalNode) {
            return;
        }

        list.innerHTML = items.map((item) => `
            <div class="checkout-item">
                <div>
                    <h3>${escapeHtml(item.title)}</h3>
                </div>
                <strong>${escapeHtml(money.format(item.price))} ₽</strong>
            </div>
        `).join("");

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        totalNode.textContent = `${money.format(total)} ₽`;
    }

    async function loadCatalogItems() {
        const response = await fetch("/api/v1/catalog", {
            method: "GET",
            credentials: "same-origin",
            mode: "same-origin",
            cache: "no-store",
            redirect: "error",
            headers: { Accept: "application/json" }
        });
        if (!response.ok) {
            throw new Error("catalog_http");
        }
        const payload = await response.json();
        return Array.isArray(payload?.items) ? payload.items : [];
    }

    function setPayEnabled(enabled) {
        const button = document.getElementById("payButton");
        if (button) {
            button.disabled = !enabled;
        }
    }

    async function hydrateCart() {
        const cartStore = window.BespalovaCartStore;
        if (!cartStore) {
            throw new Error("cart_store_missing");
        }
        const catalog = await loadCatalogItems();
        const hydrated = cartStore.hydrate(catalog);
        if (!hydrated.items.length) {
            window.location.replace("/#products");
            return null;
        }
        if (hydrated.removed) {
            setMessage(
                "Некоторые позиции больше недоступны для покупки и удалены из заказа.",
                false
            );
        }
        renderItems(hydrated.items);
        return hydrated.items;
    }

    async function submitCheckout(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const config = window.BESPALOVA_CONFIG;
        const cartStore = window.BespalovaCartStore;
        const api = window.BespalovaApi;

        setMessage("", false);

        if (!config?.paymentsEnabled) {
            setMessage("Оплата временно недоступна.", true);
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const personal = document.getElementById("consentPersonal");
        const offer = document.getElementById("consentOffer");
        if (!personal?.checked || !offer?.checked) {
            setMessage("Подтвердите оба согласия, чтобы продолжить оплату.", true);
            return;
        }

        let items;
        try {
            items = await hydrateCart();
        } catch (_error) {
            setMessage("Каталог временно недоступен. Покупка приостановлена.", true);
            setPayEnabled(false);
            return;
        }
        if (!items) {
            return;
        }

        const submit = document.getElementById("payButton");
        submit.disabled = true;
        submit.textContent = "СОЗДАЁМ СЧЁТ…";

        try {
            const payload = await api.post("/api/v1/checkout", {
                idempotency_key: ensureIdempotencyKey(),
                name: document.getElementById("checkoutName").value.trim(),
                email: document.getElementById("checkoutEmail").value.trim(),
                phone: document.getElementById("checkoutPhone").value.trim(),
                product_slugs: items.map((item) => item.id),
                consent_personal_data: true,
                privacy_policy_version: CONSENT_VERSION,
                offer_version: CONSENT_VERSION
            });

            if (!payload?.payment_url) {
                throw new Error("payment_url_missing");
            }

            cartStore.clear();
            sessionStorage.removeItem(IDEMPOTENCY_KEY);
            window.location.assign(payload.payment_url);
        } catch (error) {
            if (error?.code === "PRODUCT_NOT_PURCHASABLE") {
                try {
                    await hydrateCart();
                } catch (_ignored) {
                    // already showing the payment error below
                }
                setMessage(
                    "Состав заказа изменился. Проверьте позиции и повторите оплату.",
                    true
                );
            } else {
                setMessage(
                    error?.message || "Не удалось создать заказ. Повторите попытку позже.",
                    true
                );
            }
            submit.disabled = false;
            submit.textContent = "ОПЛАТИТЬ";
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const form = document.getElementById("checkoutForm");
        const config = window.BESPALOVA_CONFIG;

        if (!config?.paymentsEnabled) {
            setMessage("Оплата временно недоступна.", true);
            setPayEnabled(false);
            return;
        }

        try {
            const items = await hydrateCart();
            if (!items) {
                return;
            }
            setPayEnabled(true);
        } catch (_error) {
            setMessage("Каталог временно недоступен. Покупка приостановлена.", true);
            setPayEnabled(false);
        }

        form?.addEventListener("submit", submitCheckout);
    });
})();

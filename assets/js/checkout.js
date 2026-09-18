(() => {
    "use strict";

    /* G2-B4-phone-mask */
    function ruPhoneNationalDigits(value) {
      let digits = String(value || "").replace(/\D/g, "");
      if (digits.startsWith("8") || digits.startsWith("7")) digits = digits.slice(1);
      return digits.slice(0, 10);
    }
    function formatRuPhoneMask(digits) {
      const d = ruPhoneNationalDigits(digits);
      if (!d.length) return "+7 (";
      let out = "+7 (" + d.slice(0, 3);
      if (d.length < 3) return out;
      out += ") " + d.slice(3, 6);
      if (d.length < 6) return out;
      out += "-" + d.slice(6, 8);
      if (d.length < 8) return out;
      return out + "-" + d.slice(8, 10);
    }
    function canonicalRuPhone(value) {
      const d = ruPhoneNationalDigits(value);
      return d ? "+7" + d : "";
    }
    function bindRuPhoneMask(input) {
      if (!input || input.dataset.ruPhoneMask === "1") return input;
      input.dataset.ruPhoneMask = "1";
      input.setAttribute("autocomplete", "tel");
      input.setAttribute("inputmode", "tel");
      input.setAttribute("maxlength", "18");
      if (!input.getAttribute("placeholder")) input.setAttribute("placeholder", "+7 (___) ___-__-__");
      function paint(raw, moveCaret) {
        const d = ruPhoneNationalDigits(raw);
        const formatted = d.length ? formatRuPhoneMask(d) : (document.activeElement === input ? "+7 (" : "");
        input.value = formatted;
        if (moveCaret && typeof input.setSelectionRange === "function") {
          const pos = formatted.length;
          try { input.setSelectionRange(pos, pos); } catch (_error) {}
        }
      }
      input.addEventListener("focus", function () {
        if (!ruPhoneNationalDigits(input.value).length) input.value = "+7 (";
      });
      input.addEventListener("blur", function () {
        if (!ruPhoneNationalDigits(input.value).length) input.value = "";
      });
      input.addEventListener("input", function () { paint(input.value, true); });
      input.addEventListener("keydown", function (event) {
        if (event.key !== "Backspace" || event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        const d = ruPhoneNationalDigits(input.value);
        paint(d.slice(0, Math.max(0, d.length - 1)), true);
      });
      input.addEventListener("paste", function (event) {
        event.preventDefault();
        const text = ((event.clipboardData || window.clipboardData).getData("text") || "");
        paint(text, true);
      });
      if (input.value) paint(input.value, false);
      return input;
    }
    /* G2-B4-phone-mask-end */

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
                phone: canonicalRuPhone(document.getElementById("checkoutPhone").value),
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

        bindRuPhoneMask(document.getElementById("checkoutPhone"));
        form?.addEventListener("submit", submitCheckout);
    });
})();

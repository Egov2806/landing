(() => {
  const ACCEPTED_KEY = "bespalova.cookie-consent";
  const DISMISSED_KEY = "bespalova.cookie-dismissed";
  const PRIVACY_SLUGS = new Set([
    "policy-pdn",
    "privacy-policy",
    "privacy",
    "politika",
  ]);

  const root = document.querySelector("[data-cookie-banner]");
  if (!root) return;

  const policyLink = root.querySelector("[data-cookie-policy]");
  const acceptButton = root.querySelector("[data-cookie-accept]");
  const dismissButton = root.querySelector("[data-cookie-dismiss]");

  const hide = () => {
    root.hidden = true;
  };

  const show = () => {
    root.hidden = false;
  };

  const alreadyAccepted = () => {
    try {
      return window.localStorage.getItem(ACCEPTED_KEY) === "1";
    } catch {
      return false;
    }
  };

  const alreadyDismissed = () => {
    try {
      return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  };

  const persistAccepted = () => {
    try {
      window.localStorage.setItem(ACCEPTED_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }
  };

  const persistDismissed = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }
  };

  const findPrivacyUrl = (items) => {
    const list = Array.isArray(items) ? items : [];
    const bySlug = list.find((item) =>
      PRIVACY_SLUGS.has(String(item && item.slug || "").toLowerCase())
    );
    if (bySlug && bySlug.url) return String(bySlug.url);
    const byTitle = list.find((item) =>
      /конфиденц|персональн|политик/i.test(String(item && item.title || ""))
    );
    return byTitle && byTitle.url ? String(byTitle.url) : "";
  };

  const bindPolicy = async () => {
    if (!policyLink) return;
    try {
      const response = await fetch("/api/v1/site-documents", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const payload = await response.json();
      const url = findPrivacyUrl(payload && payload.items);
      if (!url) return;
      policyLink.href = url;
      policyLink.hidden = false;
    } catch {
      /* keep banner without a policy link */
    }
  };

  if (alreadyAccepted() || alreadyDismissed()) {
    hide();
    return;
  }

  show();
  bindPolicy();

  acceptButton && acceptButton.addEventListener("click", () => {
    persistAccepted();
    hide();
  });

  dismissButton && dismissButton.addEventListener("click", () => {
    persistDismissed();
    hide();
  });
})();

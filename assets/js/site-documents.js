(() => {
    "use strict";

    function isStubLink(anchor) {
        const href = (anchor.getAttribute("href") || "").trim();
        return href === "#" || href === "";
    }

    function appendDocuments(root, items) {
        items.forEach((item) => {
            const title = String(item && item.title ? item.title : "").trim();
            const url = String(item && item.url ? item.url : "").trim();
            if (!title || !url) {
                return;
            }
            const link = document.createElement("a");
            link.href = url;
            link.textContent = title;
            root.appendChild(link);
        });
    }

    async function loadSiteDocuments() {
        const roots = Array.from(document.querySelectorAll(".footer-links"));
        if (!roots.length) {
            return;
        }

        roots.forEach((root) => {
            root.querySelectorAll("a").forEach((anchor) => {
                if (isStubLink(anchor)) {
                    anchor.remove();
                }
            });
        });

        try {
            const response = await fetch("/api/v1/site-documents", {
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
                return;
            }
            const payload = await response.json();
            const items = Array.isArray(payload && payload.items)
                ? payload.items
                : [];
            roots.forEach((root) => appendDocuments(root, items));
        } catch (_error) {
            return;
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadSiteDocuments();
    });
})();

(() => {
    "use strict";

    const config = window.BESPALOVA_CONFIG;

    if (!config || config.environment !== "uat") {
        return;
    }

    window.BespalovaUat = Object.freeze({
        config,

        async checkApi() {
            return window.BespalovaApi.get("/health");
        }
    });

    console.info(
        `[Bespalova UAT] frontend bootstrap ${config.buildVersion}`
    );
})();

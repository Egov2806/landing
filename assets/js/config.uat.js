window.BESPALOVA_CONFIG = Object.freeze({
    environment: "uat",

    // Новый API будет развернут позднее на VDS.
    apiBaseUrl: "https://api-uat.bespalovalegal.ru",

    requestTimeoutMs: 15000,

    // До отдельного этапа Prodamus checkout полностью отключён.
    paymentsEnabled: false,
    livePaymentsEnabled: false,

    // Выдача доступа на первоначальном UAT только ручная.
    autoFulfillmentEnabled: false,

    buildVersion: "uat-bootstrap-0.1.0"
});

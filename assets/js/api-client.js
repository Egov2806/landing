(() => {
    "use strict";

    const config = window.BESPALOVA_CONFIG;

    if (!config) {
        throw new Error("BESPALOVA_CONFIG is not loaded");
    }

    class ApiError extends Error {
        constructor(message, status, code, requestId, details = null) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.code = code;
            this.requestId = requestId;
            this.details = details;
        }
    }

    function buildUrl(path) {
        if (!path.startsWith("/")) {
            throw new TypeError("API path must start with '/'");
        }

        return `${config.apiBaseUrl.replace(/\/+$/, "")}${path}`;
    }

    async function request(path, options = {}) {
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;

        const timeoutId = window.setTimeout(
            () => controller.abort(),
            timeoutMs
        );

        const requestId = crypto.randomUUID();

        const headers = new Headers(options.headers ?? {});
        headers.set("Accept", "application/json");
        headers.set("X-Request-ID", requestId);

        if (
            options.body !== undefined &&
            !(options.body instanceof FormData) &&
            !headers.has("Content-Type")
        ) {
            headers.set("Content-Type", "application/json");
        }

        const body =
            options.body !== undefined &&
            !(options.body instanceof FormData) &&
            typeof options.body !== "string"
                ? JSON.stringify(options.body)
                : options.body;

        try {
            const response = await fetch(buildUrl(path), {
                method: options.method ?? "GET",
                headers,
                body,
                credentials: "include",
                mode: "cors",
                cache: "no-store",
                redirect: "error",
                signal: controller.signal
            });

            const responseRequestId =
                response.headers.get("X-Request-ID") ?? requestId;

            const contentType =
                response.headers.get("Content-Type") ?? "";

            let payload = null;

            if (contentType.includes("application/json")) {
                payload = await response.json();
            } else if (response.status !== 204) {
                payload = {
                    message: await response.text()
                };
            }

            if (!response.ok) {
                throw new ApiError(
                    payload?.message ?? "Ошибка API",
                    response.status,
                    payload?.code ?? "api_error",
                    responseRequestId,
                    payload?.details ?? null
                );
            }

            return payload;
        } catch (error) {
            if (error.name === "AbortError") {
                throw new ApiError(
                    "Превышено время ожидания API",
                    0,
                    "request_timeout",
                    requestId
                );
            }

            if (error instanceof ApiError) {
                throw error;
            }

            throw new ApiError(
                "API временно недоступен",
                0,
                "network_error",
                requestId
            );
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    window.BespalovaApi = Object.freeze({
        request,
        get: (path, options = {}) =>
            request(path, { ...options, method: "GET" }),

        post: (path, body, options = {}) =>
            request(path, {
                ...options,
                method: "POST",
                body
            }),

        put: (path, body, options = {}) =>
            request(path, {
                ...options,
                method: "PUT",
                body
            }),

        patch: (path, body, options = {}) =>
            request(path, {
                ...options,
                method: "PATCH",
                body
            }),

        delete: (path, options = {}) =>
            request(path, {
                ...options,
                method: "DELETE"
            })
    });
})();

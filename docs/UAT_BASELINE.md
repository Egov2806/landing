# Bespalova Legal — UAT frontend

## Зафиксированный baseline

- Repository: `https://github.com/Egov2806/landing.git`
- Production branch: `main`
- UAT branch: `uat`
- Baseline commit: `c6c07e826d65cd49d5cd90262cdd6cc42983e46b`
- Baseline tag: `baseline-before-uat-v3.0`
- GitHub Pages production source: `main /(root)`
- Custom domain: `bespalovalegal.ru`

## Правила

1. Ветка `main` не изменяется до прохождения UAT.
2. В Git запрещено добавлять секреты и персональные данные.
3. UAT API: `https://api-uat.bespalovalegal.ru`.
4. Реальные платежи до отдельного gate отключены.
5. Пароли, TOTP и recovery codes не вводятся на GitHub Pages.
6. Account-формы будут обслуживаться VDS/API-доменом.
7. Цены и состав заказа определяет только backend.
8. Изменение frontend выполняется небольшими проверяемыми commit.

## Текущий этап

`P0.4 — frontend UAT bootstrap`.

export const appConfig = {
    wb: {
        tariffsBoxUrl: "https://common-api.wildberries.ru/api/v1/tariffs/box",
    },
    googleSheets: {
        tariffsSheetName: "stocks_coefs",
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        spreadsheetIds: ["1kx3pE4ZYBrnh3O8N8fAfUHmiwlYrbFpJiWKELIdZU4E"],
    },
} as const;

/**
 * Добавьте сюда spreadsheet_id Google Таблиц для выгрузки тарифов (лист stocks_coefs).
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    /** @type {string[]} */
    const ids = [
        // "your_google_spreadsheet_id_here",
        "1kx3pE4ZYBrnh3O8N8fAfUHmiwlYrbFpJiWKELIdZU4E",
    ];
    if (ids.length === 0) return;
    await knex("spreadsheets")
        .insert(ids.map((spreadsheet_id) => ({ spreadsheet_id })))
        .onConflict(["spreadsheet_id"])
        .ignore();
}

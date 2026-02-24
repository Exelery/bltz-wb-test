/**
 * Spreadsheet IDs for tariffs export (sheet from app.config). Default IDs come from config; add more here or in DB.
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function seed(knex) {
    const { appConfig } = await import("#config/app.config.js");
    /** @type {string[]} */
    const ids = [...appConfig.googleSheets.spreadsheetIds];
    if (ids.length === 0) return;
    await knex("spreadsheets")
        .insert(ids.map((spreadsheet_id) => ({ spreadsheet_id })))
        .onConflict(["spreadsheet_id"])
        .ignore();
}

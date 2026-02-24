import { appConfig } from "#config/app.config.js";
import env from "#config/env/env.js";
import knex from "#postgres/knex.js";
import { google } from "googleapis";

function getAuth() {
    const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
    }
    const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
    const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: [...appConfig.googleSheets.scopes],
    });
    return auth;
}

export async function getLatestTariffsSortedByCoef(): Promise<
    Array<Record<string, string | number | null>>
> {
    const latest = await knex("box_tariffs")
        .select("tariff_date")
        .orderBy("tariff_date", "desc")
        .limit(1)
        .first();
    if (!latest) return [];
    const rows = await knex("box_tariffs")
        .where("tariff_date", latest.tariff_date)
        .orderBy("box_storage_coef_expr", "asc")
        .select(
            "warehouse_name",
            "geo_name",
            "box_storage_coef_expr",
            "box_storage_base",
            "box_storage_liter",
            "box_delivery_coef_expr",
            "box_delivery_base",
            "box_delivery_liter"
        );
    return rows as Array<Record<string, string | number | null>>;
}

export async function updateSpreadsheet(spreadsheetId: string): Promise<void> {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const data = await getLatestTariffsSortedByCoef();
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const rows = [headers, ...data.map((r) => headers.map((h) => String(r[h] ?? "")))];

    const { data: spreadsheet } = await sheets.spreadsheets.get({
        spreadsheetId,
    });
    const sheet = spreadsheet.sheets?.find((s) => s.properties?.title === appConfig.googleSheets.tariffsSheetName);
    let sheetId = sheet?.properties?.sheetId;

    if (sheetId == null) {
        const res = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: { title: appConfig.googleSheets.tariffsSheetName },
                        },
                    },
                ],
            },
        });
        sheetId = res.data.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
    }

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${appConfig.googleSheets.tariffsSheetName}'!A:Z`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
    });
}

export async function syncAllSpreadsheets(): Promise<void> {
    if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.warn("GOOGLE_SERVICE_ACCOUNT_JSON not set, skipping sheets sync");
        return;
    }
    const list = await knex("spreadsheets").select("spreadsheet_id");
    for (const { spreadsheet_id } of list) {
        try {
            await updateSpreadsheet(spreadsheet_id);
            console.log(`Synced spreadsheet ${spreadsheet_id}`);
        } catch (e) {
            console.error(`Failed to sync ${spreadsheet_id}:`, e);
        }
    }
}

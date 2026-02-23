import env from "#config/env/env.js";
import knex from "#postgres/knex.js";
import type { BoxTariffRow } from "#types/wb-tariffs.js";
import type { WbBoxTariffsResponse } from "#types/wb-tariffs.js";

const WB_BOX_TARIFFS_URL = "https://common-api.wildberries.ru/api/v1/tariffs/box";

function parseDecimal(s: string | undefined): number | null {
    if (s == null || s === "") return null;
    const normalized = String(s).replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isNaN(n) ? null : n;
}

export async function fetchBoxTariffs(date: string): Promise<WbBoxTariffsResponse | null> {
    const token = env.WB_API_TOKEN;
    if (!token) {
        console.warn("WB_API_TOKEN not set, skipping tariffs fetch");
        return null;
    }
    const url = `${WB_BOX_TARIFFS_URL}?date=${date}`;
    const res = await fetch(url, {
        headers: { Authorization: token },
    });
    if (!res.ok) {
        console.error(`WB tariffs API error: ${res.status} ${res.statusText}`);
        return null;
    }
    const json = (await res.json()) as WbBoxTariffsResponse;
    if (!json?.response?.data?.warehouseList) {
        console.warn("WB tariffs: empty or invalid response");
        return null;
    }
    return json;
}

export function toBoxTariffRows(
    date: string,
    data: WbBoxTariffsResponse["response"]["data"]
): BoxTariffRow[] {
    return data.warehouseList.map((w) => ({
        tariff_date: date,
        warehouse_name: w.warehouseName ?? "",
        geo_name: w.geoName ?? null,
        box_delivery_base: parseDecimal(w.boxDeliveryBase),
        box_delivery_coef_expr: parseDecimal(w.boxDeliveryCoefExpr),
        box_delivery_liter: parseDecimal(w.boxDeliveryLiter),
        box_delivery_marketplace_base: parseDecimal(w.boxDeliveryMarketplaceBase),
        box_delivery_marketplace_coef_expr: parseDecimal(w.boxDeliveryMarketplaceCoefExpr),
        box_delivery_marketplace_liter: parseDecimal(w.boxDeliveryMarketplaceLiter),
        box_storage_base: parseDecimal(w.boxStorageBase),
        box_storage_coef_expr: parseDecimal(w.boxStorageCoefExpr),
        box_storage_liter: parseDecimal(w.boxStorageLiter),
        dt_next_box: data.dtNextBox ?? null,
        dt_till_max: data.dtTillMax ?? null,
    }));
}

export async function saveBoxTariffsForDate(date: string): Promise<number> {
    const response = await fetchBoxTariffs(date);
    if (!response) return 0;
    const rows = toBoxTariffRows(date, response.response.data);
    if (rows.length === 0) return 0;
    await knex("box_tariffs")
        .insert(rows)
        .onConflict(["tariff_date", "warehouse_name"])
        .merge();
    return rows.length;
}

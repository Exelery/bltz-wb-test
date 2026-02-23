/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
    await knex.schema.createTable("box_tariffs", (table) => {
        table.date("tariff_date").notNullable();
        table.string("warehouse_name").notNullable();
        table.string("geo_name");
        table.decimal("box_delivery_base", 14, 4);
        table.decimal("box_delivery_coef_expr", 14, 4);
        table.decimal("box_delivery_liter", 14, 4);
        table.decimal("box_delivery_marketplace_base", 14, 4);
        table.decimal("box_delivery_marketplace_coef_expr", 14, 4);
        table.decimal("box_delivery_marketplace_liter", 14, 4);
        table.decimal("box_storage_base", 14, 4);
        table.decimal("box_storage_coef_expr", 14, 4);
        table.decimal("box_storage_liter", 14, 4);
        table.string("dt_next_box");
        table.string("dt_till_max");
        table.primary(["tariff_date", "warehouse_name"]);
    });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
    return knex.schema.dropTable("box_tariffs");
}

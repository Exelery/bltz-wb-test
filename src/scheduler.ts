import { saveBoxTariffsForDate } from "#services/wb-tariffs.js";
import { syncAllSpreadsheets } from "#services/google-sheets.js";

const HOUR_MS = 60 * 60 * 1000;
const SHEETS_INTERVAL_MS = 6 * HOUR_MS;

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

async function runTariffsJob(): Promise<void> {
    const date = todayISO();
    try {
        const n = await saveBoxTariffsForDate(date);
        if (n > 0) console.log(`Box tariffs saved for ${date}: ${n} rows`);
    } catch (e) {
        console.error("Tariffs job error:", e);
    }
}

async function runSheetsJob(): Promise<void> {
    try {
        await syncAllSpreadsheets();
    } catch (e) {
        console.error("Sheets sync error:", e);
    }
}

export function startScheduler(): void {
    runTariffsJob();
    setInterval(runTariffsJob, HOUR_MS);

    runSheetsJob();
    setInterval(runSheetsJob, SHEETS_INTERVAL_MS);
}

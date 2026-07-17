import {
    getDrivers,
    getIntervals,
    getLaps,
    getPitstops,
    getPositions,
    getStints,
} from ".";

export async function getRaceData(sessionKey: number){
    const drivers = await getDrivers(sessionKey);
    const laps = await getLaps(sessionKey);
    const stints = await getStints(sessionKey);
    const pitstops = await getPitstops(sessionKey);
    const intervals = await getIntervals(sessionKey);

    // Positions is the newest, heaviest call — if it fails or times out
    // for any reason, don't let it take the whole race-data response
    // down with it. Everything else still returns normally.
    let positions: Awaited<ReturnType<typeof getPositions>> = [];
    try {
        positions = await getPositions(sessionKey);
    } catch (error) {
        console.error("Failed to fetch positions (continuing without them):", error);
    }

    return{
    drivers,
    laps,
    stints,
    pitstops,
    intervals,
    positions,
};
}
import {
    getDrivers,
    getIntervals,
    getLaps,
    getPitstops,
    getStints,
} from ".";

export async function getRaceData(sessionKey: number){
    const drivers = await getDrivers(sessionKey);
    const laps = await getLaps(sessionKey);
    const stints = await getStints(sessionKey);
    const pitstops = await getPitstops(sessionKey);
    const intervals = await getIntervals(sessionKey);

    return{
    drivers,
    laps,
    stints,
    pitstops,
    intervals,
};
}



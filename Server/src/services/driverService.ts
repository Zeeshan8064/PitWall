import { OPENF1_BASE } from "../constants";
import { fetchOpenF1 } from "../lib";
import { mapDriver } from "../mappers";
import { OpenF1Driver } from "../types";

export async function getDrivers(sessionKey: number) {
  const drivers = await fetchOpenF1<OpenF1Driver>(
    `/drivers?session_key=${sessionKey}`
  );

  return drivers.map(mapDriver);
}
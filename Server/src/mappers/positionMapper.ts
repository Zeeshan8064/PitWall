import { OpenF1Position } from "../types";

export function mapPosition(position: OpenF1Position) {
  return {
    driverNumber: position.driver_number,
    position: position.position,
    date: position.date,
  };
}
export function getRaceClassification(
  positions: {
    driverNumber: number;
    position: number;
    date: string;
  }[]
) {
  const startPositionByDriver = new Map<
    number,
    { position: number; date: string }
  >();

  const finishPositionByDriver = new Map<
    number,
    { position: number; date: string }
  >();

  for (const row of positions) {
    const start = startPositionByDriver.get(row.driverNumber);

    if (!start || new Date(row.date) < new Date(start.date)) {
      startPositionByDriver.set(row.driverNumber, row);
    }

    const finish = finishPositionByDriver.get(row.driverNumber);

    if (!finish || new Date(row.date) > new Date(finish.date)) {
      finishPositionByDriver.set(row.driverNumber, row);
    }
  }

  return {
    startPositionByDriver,
    finishPositionByDriver,
  };
}
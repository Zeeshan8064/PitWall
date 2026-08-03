import { Driver, RaceResult } from "../models";

// Previously this walked every race in the season, fetching a full position
// feed per race over the rate-limited OpenF1 client. It is now one aggregation
// over the ingested results.
export async function getDriverSeasonStats(driverNumber: number, year = 2026) {
  const driver: any = await Driver.findOne({ driverNumber }, { _id: 1 }).lean();

  if (!driver) {
    return { starts: 0, wins: 0, podiums: 0, averageFinish: 0 };
  }

  const [stats] = await RaceResult.aggregate([
    { $match: { driver: driver._id } },
    {
      $lookup: {
        from: "races",
        localField: "race",
        foreignField: "_id",
        as: "race",
      },
    },
    { $unwind: "$race" },
    { $match: { "race.season": year, status: { $ne: "DNS" } } },
    {
      $group: {
        _id: null,
        starts: { $sum: 1 },
        wins: {
          $sum: { $cond: [{ $eq: ["$finishPosition", 1] }, 1, 0] },
        },
        podiums: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$finishPosition", null] },
                  { $lte: ["$finishPosition", 3] },
                ],
              },
              1,
              0,
            ],
          },
        },
        averageFinish: { $avg: "$finishPosition" },
      },
    },
  ]);

  return {
    starts: stats?.starts ?? 0,
    wins: stats?.wins ?? 0,
    podiums: stats?.podiums ?? 0,
    averageFinish: stats?.averageFinish ?? 0,
  };
}

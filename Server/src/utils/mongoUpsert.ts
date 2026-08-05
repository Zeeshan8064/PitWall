import mongoose from "mongoose";

interface UpsertOptions {
  omitNull?: string[];
}

export async function upsertMany(
  model: mongoose.Model<any>,
  docs: Record<string, any>[],
  keyOf: (doc: Record<string, any>) => Record<string, any>,
  options: UpsertOptions = {}
) {
  if (docs.length === 0) return;

  const omitNull = options.omitNull ?? [];

  await model.bulkWrite(
    docs.map((doc) => {
      const update = { ...doc };

      for (const field of omitNull) {
        if (update[field] === null || update[field] === undefined) {
          delete update[field];
        }
      }

      return {
        updateOne: {
          filter: keyOf(doc),
          update: { $set: update },
          upsert: true,
        },
      };
    }),
    { ordered: false }
  );
}

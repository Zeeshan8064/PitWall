import mongoose from "mongoose";

// Every ingest write is an idempotent upsert keyed on the unique index the
// schema already declares, so re-running an ingest is safe and cheap.
export async function upsertMany(
  model: mongoose.Model<any>,
  docs: Record<string, any>[],
  keyOf: (doc: Record<string, any>) => Record<string, any>
) {
  if (docs.length === 0) return;

  await model.bulkWrite(
    docs.map((doc) => ({
      updateOne: {
        filter: keyOf(doc),
        update: { $set: doc },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}

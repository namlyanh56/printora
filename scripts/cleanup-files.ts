import { db } from "@/lib/db";
import { deleteLocalStoredFile } from "@/lib/file";

async function run() {
  // status accepted + file not deleted
  const res = await db.query(
    `
    SELECT
      of.id AS file_id,
      of.order_id AS order_db_id,
      of.storage_path
    FROM order_files of
    INNER JOIN orders o ON o.id = of.order_id
    WHERE o.status = 'accepted'
      AND of.is_deleted = false
    ORDER BY of.created_at ASC
    LIMIT 500
    `
  );

  let success = 0;
  let failed = 0;

  for (const row of res.rows) {
    const fileId: string = row.file_id;
    const orderDbId: string = row.order_db_id;
    const storagePath: string = row.storage_path;

    try {
      const del = await deleteLocalStoredFile(storagePath);

      if (del.ok) {
        await db.query(
          `
          UPDATE order_files
          SET is_deleted = true, deleted_at = NOW()
          WHERE id = $1
          `,
          [fileId]
        );

        await db.query(
          `
          INSERT INTO order_logs (order_id, event_type, event_payload)
          VALUES ($1, 'file_deleted', $2::jsonb)
          `,
          [orderDbId, JSON.stringify({ fileId, storagePath, existed: del.existed, source: "daily_cleanup" })]
        );

        success += 1;
      } else {
        await db.query(
          `
          INSERT INTO order_logs (order_id, event_type, event_payload)
          VALUES ($1, 'file_delete_failed', $2::jsonb)
          `,
          [orderDbId, JSON.stringify({ fileId, storagePath, error: del.error ?? "unknown", source: "daily_cleanup" })]
        );
        failed += 1;
      }
    } catch (e) {
      await db.query(
        `
        INSERT INTO order_logs (order_id, event_type, event_payload)
        VALUES ($1, 'file_delete_failed', $2::jsonb)
        `,
        [
          orderDbId,
          JSON.stringify({
            fileId,
            storagePath,
            error: e instanceof Error ? e.message : "unknown",
            source: "daily_cleanup",
          }),
        ]
      );
      failed += 1;
    }
  }

  console.info("[cleanup-files] done", {
    total: res.rowCount ?? 0,
    success,
    failed,
  });

  await db.end();
}

run().catch(async (e) => {
  console.error("[cleanup-files] fatal", e);
  await db.end().catch(() => undefined);
  process.exit(1);
});

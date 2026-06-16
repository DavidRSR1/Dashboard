import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = path.join(root, "extension");
const publicDir = path.join(root, "public");
const outputPath = path.join(publicDir, "dashboard-cronograma-extension.zip");

await mkdir(publicDir, { recursive: true });

await new Promise((resolve, reject) => {
  const output = createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", resolve);
  archive.on("error", reject);

  archive.pipe(output);
  archive.directory(extensionDir, false);
  archive.finalize();
});

console.log(`Extensão empacotada: ${outputPath}`);

import { File } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";
import type { Id } from "../../../convex/_generated/dataModel";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type Begin = typeof api.social.beginUpload;
export async function uploadMedia(
  asset: Pick<ImagePickerAsset, "uri" | "file" | "type" | "mimeType" | "duration">,
  begin: (args: FunctionArgs<Begin>) => Promise<FunctionReturnType<Begin>>,
  progress: (percent: number) => void,
) {
  const native = Platform.OS === "web" ? undefined : new File(asset.uri);
  const file = native ?? asset.file;
  if (!file || !file.size) throw new Error("Couldn’t read the selected file. Choose it again.");
  if (file.size > 100 * 1024 * 1024) throw new Error("Choose a file of 100 MB or less.");
  const contentType = file.type || asset.mimeType;
  if (!contentType) throw new Error("This file format could not be identified.");
  const sha256 = native ? await native.digest("SHA-256") :
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
      byte => byte.toString(16).padStart(2, "0")).join("");
  const { uploadId, url, uploadContentType } = await begin({
    sha256, size: file.size, contentType,
    ...(asset.type === "video" ? { durationMs: asset.duration ?? 0 } : {}),
  });
  const headers = { "Content-Type": uploadContentType };
  let response: { status: number; body: string };
  if (native) {
    response = await native.upload(url, {
      headers,
      onProgress: ({ bytesSent, totalBytes }) => {
        // Native progress events can carry 64-bit byte counts as BigInts.
        const total = Number(totalBytes);
        const expected = total > 0 ? total : Number(file.size);
        progress(Math.min(100, Math.round(100 * Number(bytesSent) / expected)));
      },
    });
  } else {
    const result = await fetch(url, { method: "POST", headers, body: asset.file });
    response = { status: result.status, body: await result.text() };
  }
  if (response.status < 200 || response.status >= 300) throw new Error("Upload failed. Please try again.");
  const { storageId } = JSON.parse(response.body);
  if (typeof storageId !== "string") throw new Error("Upload could not be confirmed. Try again.");
  progress(100);
  return { uploadId, storageId: storageId as Id<"_storage"> };
}

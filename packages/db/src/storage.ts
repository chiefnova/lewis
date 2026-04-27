import { createHash } from "node:crypto";

export type StorageObjectInput = {
  tenantId: string;
  bucket: string;
  objectPath: string;
  bytes: Buffer;
  mimeType: string;
  uploadedByUserId: string;
  immutableRef?: boolean;
};

export type StorageObjectDescriptor = {
  bucket: string;
  objectPath: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  immutableRef: boolean;
};

export function describeStorageObject(input: StorageObjectInput): StorageObjectDescriptor {
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  return {
    bucket: input.bucket,
    objectPath: input.objectPath,
    sha256,
    sizeBytes: input.bytes.byteLength,
    mimeType: input.mimeType,
    immutableRef: input.immutableRef ?? false,
  };
}

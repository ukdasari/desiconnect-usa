import { Global, Inject, Injectable, Module } from "@nestjs/common";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { APP_CONFIG, type AppConfig } from "../config/config.module";

/**
 * Private object storage for resumes and verification documents.
 * Files are never served publicly; the API streams them only to authorized users.
 */
@Injectable()
export class StorageService {
  private readonly s3: S3Client | null;
  private readonly localDir: string;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.localDir = path.resolve(config.STORAGE_LOCAL_DIR);
    this.s3 =
      config.STORAGE_DRIVER === "s3"
        ? new S3Client({
            region: config.S3_REGION,
            endpoint: config.S3_ENDPOINT || undefined,
            forcePathStyle: !!config.S3_ENDPOINT,
            credentials: config.S3_ACCESS_KEY_ID
              ? { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }
              : undefined,
          })
        : null;
  }

  async put(prefix: string, buffer: Buffer, mimeType: string, extension: string): Promise<string> {
    const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}${extension}`;
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType, ServerSideEncryption: "AES256" }),
      );
    } else {
      const file = this.safeLocalPath(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, buffer, { mode: 0o600 });
    }
    return key;
  }

  async get(key: string): Promise<Buffer> {
    if (this.s3) {
      const out = await this.s3.send(new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }));
      const body = out.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(Buffer.from(chunk as Uint8Array));
      return Buffer.concat(chunks);
    }
    return readFile(this.safeLocalPath(key));
  }

  /** Deletes a stored file. Missing files are ignored. */
  async remove(key: string): Promise<void> {
    if (this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }));
      return;
    }
    await rm(this.safeLocalPath(key), { force: true });
  }

  private safeLocalPath(key: string): string {
    const resolved = path.resolve(this.localDir, key);
    if (!resolved.startsWith(this.localDir + path.sep)) throw new Error("Invalid storage key");
    return resolved;
  }
}

/** Detects the real file type from magic bytes rather than trusting the client's Content-Type. */
export function sniffDocumentType(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", extension: ".pdf" };
  // DOCX is a ZIP container that includes word/document.xml
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer.includes(Buffer.from("word/"))) {
    return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx" };
  }
  return null;
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}

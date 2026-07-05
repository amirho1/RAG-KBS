/**
 * Minimal uploaded file shape used by Nest's multipart interceptor.
 */
export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

import { Config } from '@/constants/config';

interface UploadOptions {
  folder?: string;
  publicId?: string;
}

export interface UploadFileInput {
  uri: string;
  name?: string;
  type?: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
}

function getMimeType(uri: string): string {
  const normalized = uri.toLowerCase();
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function getFileName(uri: string): string {
  const segment = uri.split('/').pop();
  if (segment && segment.includes('.')) return segment;
  return `capture-${Date.now()}.jpg`;
}

function ensureCloudinaryConfig() {
  if (!Config.CLOUDINARY_CLOUD_NAME || !Config.CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary no está configurado. Define EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME y EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }
}

export async function uploadImageToCloudinary(
  uri: string,
  options: UploadOptions = {},
): Promise<string> {
  ensureCloudinaryConfig();

  const formData = new FormData();
  formData.append('upload_preset', Config.CLOUDINARY_UPLOAD_PRESET);

  if (options.folder) {
    formData.append('folder', options.folder);
  }

  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  formData.append('file', {
    uri,
    name: getFileName(uri),
    type: getMimeType(uri),
  } as any);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${Config.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'No se pudo subir la imagen a Cloudinary');
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  return data.secure_url;
}

export async function uploadFileToCloudinary(
  file: UploadFileInput,
  options: UploadOptions = {},
): Promise<string> {
  ensureCloudinaryConfig();

  const formData = new FormData();
  formData.append('upload_preset', Config.CLOUDINARY_UPLOAD_PRESET);

  if (options.folder) {
    formData.append('folder', options.folder);
  }

  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  formData.append('file', {
    uri: file.uri,
    name: file.name ?? getFileName(file.uri),
    type: file.type ?? 'application/octet-stream',
  } as any);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${Config.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'No se pudo subir el archivo a Cloudinary');
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  return data.secure_url;
}
import { apiClient } from './client';

export interface ImageUploadResponse {
  imageName: string;
  imageLocation: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
}

export interface ImageInfo {
  imageName: string;
  imageLocation: string;
  publicId: string;
  format?: string;
  width?: number;
  height?: number;
}

export interface MultipleImageUploadResponse {
  data: ImageInfo[];
  count: number;
}

export interface DeleteImageResponse {
  message: string;
  publicId: string;
}

export const imageApi = {
  // Upload a single image
  uploadImage: async (file: File): Promise<ImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/api/v1/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload multiple images
  uploadMultipleImages: async (files: File[]): Promise<MultipleImageUploadResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post('/api/v1/images/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete an image
  deleteImage: async (publicId: string): Promise<DeleteImageResponse> => {
    // Replace slashes with underscores for the API call
    const encodedPublicId = publicId.replace(/\//g, '_');
    const response = await apiClient.delete(`/api/v1/images/${encodedPublicId}`);
    return response.data;
  },
};

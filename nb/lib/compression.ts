import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file using browser-image-compression.
 * 
 * @param file The original image file
 * @returns The compressed image file, or the original if compression fails/is not needed
 */
export async function compressImage(file: File): Promise<File> {
  // Options tailored for a "Premium" but performant web experience
  // 1920px width is sufficient for almost all screens
  // 0.85 quality retains high visual fidelity while cutting size significantly
  const options = {
    maxSizeMB: 4, // Generous limit to ensure quality isn't crushed
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type as string,
    initialQuality: 0.85,
  };

  try {
    // Only compress if it's an image and larger than 1MB
    if (!file.type.startsWith('image/') || file.size < 1024 * 1024) {
      return file;
    }

    console.log(`🗜️ Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)...`);
    const compressedFile = await imageCompression(file, options);
    console.log(`✅ Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Fallback to original
  }
}

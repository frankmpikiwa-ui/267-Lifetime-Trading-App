/**
 * Resizes a base64 image to a maximum dimension while maintaining aspect ratio.
 * This helps reduce payload size for mobile networks and API limits.
 */
export async function resizeImage(base64Str: string, maxDimension: number = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Use jpeg for better compression
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = (err) => reject(err);
    img.src = base64Str;
  });
}

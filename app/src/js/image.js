/**
 * Obtains image dimensions from an <img> Element
 * @param {HTMLImageElement} image element
 * @returns Promise<{ height, width }>
 */
export function getImageDimensions(image) {
  return new Promise((resolve, _reject) => {
      image.onload = function(_error){
          const width = this.width
          const height = this.height
          resolve({ height, width })
      }
  })
}

/**
 * Compresses an image using the Canvas API
 * @param {HTMLImageElement} image element
 * @param {*} scale Scale of the compressed image, between 0-1
 * @param {*} initialWidth Initial width of uncompressed image
 * @param {*} initialHeight Initial height of uncompressed
 * @returns Promise blob
 */
export function compressImage(image, scale, initialWidth, initialHeight){
  return new Promise((resolve, _reject) => {
      const canvas = document.createElement("canvas")

      canvas.width = scale * initialWidth
      canvas.height = scale * initialHeight

      const ctx = canvas.getContext("2d")
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

      ctx.canvas.toBlob((blob) => {
          resolve(blob)
      }, "image/jpeg")
  })
}
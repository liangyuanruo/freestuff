console.log('Start');

/**
 * Obtains image dimensions from an <img> Element
 * @param {HTMLImageElement} image element
 * @returns Promise<{ height, width }>
 */
function getImageDimensions(image) {
  return new Promise((resolve, _reject) => {
      image.onload = function(_error){
          const width = this.width;
          const height = this.height;
          resolve({ height, width });
      };
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
function compressImage(image, scale, initialWidth, initialHeight){
  return new Promise((resolve, _reject) => {
      const canvas = document.createElement("canvas");

      canvas.width = scale * initialWidth;
      canvas.height = scale * initialHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      ctx.canvas.toBlob((blob) => {
          resolve(blob);
      }, "image/jpeg");
  })
}

const overlay = document.querySelector('.overlay');
const deleteButton = document.querySelector('#delete');
const cancelButton = document.querySelector('#cancel');
const confirmButton = document.querySelector('#confirm');
const deleteForm = document.querySelector('#deleteForm');
deleteButton?.addEventListener('click', (event) => {
  console.log('deleteButtonHandler: Start');
  event.preventDefault();
  overlay.classList.remove('hidden');
});
cancelButton?.addEventListener('click', (event) => {
  console.log('cancelButtonHandler: Start');
  overlay.classList.add('hidden');
});
confirmButton?.addEventListener('click', (event) => {
  console.log('confirmButtonHandler: Start');
  deleteForm.submit();
});

// Scripts for the create new listing page
if (document.querySelector('form.listing')) {
  console.log('Creating checks to enable submit button if all fields are filled');
  const submit = document.querySelector('button[type=submit]');
  const form = document.querySelector('form');
  const fields = document.querySelectorAll('form input, form select');
  const checkSubmit = () => {
    console.log('checkSubmit: Start');
    for (const field of fields) {
      // If fields are an empty string, undefined, or null then disable the button
      if (!field.value) {
        console.log('checkSubmit: Some fields empty. Disabling submit button');
        submit.disabled = true;
        return
      }
    }
    console.log('checkSubmit: All fields filled. Enabling submit button');
    submit.disabled = false;
  };
  checkSubmit();
  form?.addEventListener('input', checkSubmit);
  form?.addEventListener('change', checkSubmit);
  setTimeout(checkSubmit, 1000); // Timeout to check for browser autofill

  console.log('Creating checks to display image preview if file selected');
  const [ preview ] = document.getElementsByClassName('preview');
  const [ fileChange ] = document.getElementsByClassName('change');
  const fileInput = document.getElementById('file');

  const checkFile = async () => {
    console.log('checkFile: Start');

    const [ uploadedImage ] = fileInput.files;

    if (uploadedImage) {
      console.log('checkFile: File selected. Displaying preview');
      // HTMLImageElement to hold the uploaded image temporarily
      const temp = document.createElement('img');
      temp.src = URL.createObjectURL(uploadedImage);

      // Obtain dimensions
      const { height, width } = await getImageDimensions(temp);

      // Compression
      const MAX_WIDTH = 1024; // if we resize by width, this is the max width of compressed image
      const MAX_HEIGHT = 1024; // if we resize by height, this is the max height of the compressed image

      const widthRatioBlob = await compressImage(temp, MAX_WIDTH / width, width, height);
      const heightRatioBlob = await compressImage(temp, MAX_HEIGHT / height, width, height);

      // Pick the smaller blob between both
      const compressedBlob = widthRatioBlob.size > heightRatioBlob.size ? heightRatioBlob : widthRatioBlob;

      // Reuse the uploaded image in case the uploaded image is smaller than our compressed result.
      const optimalBlob = compressedBlob.size < uploadedImage.size ? compressedBlob : uploadedImage;

      // Display the compressed image
      preview.src = URL.createObjectURL(optimalBlob);

      console.log(`Initial size: ${uploadedImage.size}. Compressed size: ${optimalBlob.size}`);

      // Display file
      preview.classList.remove('hidden');
      fileChange.classList.remove('hidden');

      // Cleanup
      URL.revokeObjectURL(temp.src);
    }
  };

  checkFile();
  fileInput?.addEventListener('change', checkFile);
  setTimeout(checkFile, 1000); // Timeout to check for browser autofill
}

console.log('End');

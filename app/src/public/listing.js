console.log('Start');

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
  const preview = document.getElementsByClassName('preview')[0];
  const fileChange = document.getElementsByClassName('change')[0];
  const fileInput = document.getElementById('file');
  const checkFile = () => {
    console.log('checkFile: Start');
    const [file] = fileInput.files;
    if (file) {
      console.log('checkFile: File selected. Displaying preview');
      preview.src = URL.createObjectURL(file);
      preview.classList.remove('hidden');
      fileChange.classList.remove('hidden');
    }
  };
  checkFile();
  fileInput?.addEventListener('change', checkFile);
  setTimeout(checkFile, 1000); // Timeout to check for browser autofill
}

console.log('End');

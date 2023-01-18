const preview = document.getElementsByClassName('preview')[0];
const fileChange = document.getElementsByClassName('change')[0];
const fileInput = document.getElementById('file');
fileInput.onchange = event => {
  const [file] = fileInput.files;
  console.log(file);
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
    fileChange.classList.remove("hidden");
  }
};

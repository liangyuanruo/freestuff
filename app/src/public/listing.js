console.log("hello listing.js");


const preview = document.getElementsByClassName('preview')[0];
const fileInput = document.getElementById('file');
fileInput.onchange = event => {
  const [file] = fileInput.files;
  console.log(file);
  if (file) preview.src = URL.createObjectURL(file);
};

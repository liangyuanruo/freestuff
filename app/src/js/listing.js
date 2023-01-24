// Disable the submit button by default
const submit = document.querySelector('button[type=submit]')
submit.disabled = true

// Enable the submit button only if all fields are filled
const form = document.querySelector('form')
const fields = document.querySelectorAll('form input, form select')
form.addEventListener('change', () => {
  // If fields are an empty string, undefined, or null then disable the button
  for (const field of fields) {
    if (!field.value) {
      submit.disabled = true
      return
    }
  }
  // If all pass then enable submit
  submit.disabled = false
})

// Set
const preview = document.getElementsByClassName('preview')[0]
const fileChange = document.getElementsByClassName('change')[0]
const fileInput = document.getElementById('file')
fileInput.onchange = event => {
  const [file] = fileInput.files
  console.log(file)
  if (file) {
    preview.src = URL.createObjectURL(file)
    preview.classList.remove('hidden')
    fileChange.classList.remove('hidden')
  }
}

// Reference to search UI elements
const searchFilter = document.querySelector('#search')
const categoryFilter = document.querySelector('#category')
const locationFilter = document.querySelector('#location')

/**
 * Debounce implementation
 * @param {Function} callback Function to debounce
 * @param {number} wait Time in milliseconds before callback is fired
 * @returns Debounced function
 */
function debounce(callback, wait) {
  let timeout;
  return (...args) => {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => callback.apply(context, args), wait);
  };
}

/**
 * Syncs the search filters in the UI with the query parameters in the URL
 */
const syncFiltersWithQueryParams = () => {
  const url = new URL(window.location)

  const searchQuery = url.searchParams.get('s')
  const searchCategory = url.searchParams.get('c')
  const searchLocation = url.searchParams.get('l')

  if (searchQuery !== null) searchFilter.value = searchQuery
  if (searchCategory !== null) categoryFilter.value = searchCategory
  if (searchLocation !== null) locationFilter.value = searchLocation
}

/**
 * Fetch and update current listings by leveraging the existing server-side rendered endpoint.
 * The function works by re-fetching the current homepage, parsing the HTML into a DOM tree, and
 * replacing the subtree.
 */
const fetchAndUpdateListings = async () => {
  const url = new URL(window.location)

  return fetch(`/?${url.searchParams}`, { method: 'GET', cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`fetchAndUpdateListings failed with HTTP status: ${response.status} ${response.statusText}`)
      }
      return response.text()
    })
    .then((html) => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const newListings = doc.querySelector('.listings')
      const oldListings = document.querySelector('.listings')

      oldListings.parentNode.replaceChild(newListings, oldListings)
    })
    .catch(error => console.error(`fetchAndUpdateListings failed with error: ${error}`))
}

/**
 * Function that returns an event handler that syncs an Event.target to a URL query parameter.
 * @param {string} key of the query parameter to use
 * @returns Event handler
 */
const onChange = (param) => (event) => {
  const value = event.target.value

  const url = new URL(window.location)
  url.searchParams.set(param, value)
  window.history.pushState({}, '', url)

  fetchAndUpdateListings()
}

// Event handlers
const onSearchChange = debounce(onChange('s'), 300)
const onCategoryChange = onChange('c')
const onLocationChange = onChange('l')

searchFilter.addEventListener('input', onSearchChange)
searchFilter.addEventListener('change', onSearchChange)
categoryFilter.addEventListener('change', onCategoryChange)
locationFilter.addEventListener('change', onLocationChange)

window.addEventListener('popstate', syncFiltersWithQueryParams) // updates UI when back button is pressed

syncFiltersWithQueryParams()

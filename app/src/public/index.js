console.log('Start');

const searchFilter = document.querySelector('#search');
const categoryFilter = document.querySelector('#category');
const locationFilter = document.querySelector('#location');
const filterListings = () => {
  console.log('filterListings: Start');
  const listings = document.querySelectorAll('.listing');
  listings.forEach(listing => {
    listing.classList.remove('hidden');

    if (searchFilter.value) {
      const description = listing.querySelector('.description').textContent.toLowerCase();
      const searchQuery = searchFilter.value.toLowerCase();
      if (!description.includes(searchQuery)) listing.classList.add('hidden');
    }

    if (categoryFilter.value) {
      const category = listing.querySelector('.category').textContent;
      if (category !== categoryFilter.value) listing.classList.add('hidden');
    }

    if (locationFilter.value) {
      const location = listing.querySelector('.location span').textContent;
      if (location !== locationFilter.value) listing.classList.add('hidden');
    }
  });
};

searchFilter.addEventListener('input', filterListings);
searchFilter.addEventListener('change', filterListings);
categoryFilter.addEventListener('change', filterListings);
locationFilter.addEventListener('change', filterListings);
setTimeout(filterListings, 1000); // Timeout to check for browser autofill
console.log('End');

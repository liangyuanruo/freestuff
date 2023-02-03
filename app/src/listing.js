
/**
 * Helper function to construct the relevant SQL query for querying the listing
 * @param {string} userType One of 'charity', 'auth', or 'public'
 * @param {options} additional parameters for search
 */
export function getListingQuery(userType, { userId, searchTerm, searchCategory, searchLocation }) {

  // Static clauses that don't change
  const select = '"listing_id", "listing_description", "listing_location", "listing_created_at", "listing_image_key", "listing_category"'
  const from = '"listing" INNER JOIN "account" ON "listing"."listing_owner_id" = "account"."account_id"'
  const orderBy = '"listing_created_at" DESC'

  // Result
  let sql = ''
  const bindings = []

  // Intermediate state tracking
  let numWhere = 0 // number of where/and clauses so far

  // Helper to update numWhere and determine whether to use WHERE or AND
  function addWhere(expr) {
    sql += ` ${numWhere == 0 ? 'WHERE' : 'AND'} ${expr} `
    numWhere++
  }

  // Start constructing the query
  sql += `SELECT ${select} `
  sql += ` FROM ${from} `

  // Add search conditionals
  if (searchTerm) {
    bindings.push(searchTerm)
    addWhere(`"textsearchable_index_col" @@ to_tsquery($${bindings.length})`)
  }
  if (searchCategory) {
    bindings.push(searchCategory)
    addWhere(`"listing_category" = $${bindings.length}`)
  }
  if (searchLocation) {
    bindings.push(searchLocation)
    addWhere(`"listing_location" = $${bindings.length}`)
  }

  // Add additional clauses based on query type
  // Charity users see everything so no additional conditionals are added

  if (userType === 'auth') {
    // Logged in users see can their own posts even if less than 48 hours
    bindings.push(userId)
    addWhere(`( "listing_created_at" < NOW() - INTERVAL \'48 hours\' OR "listing_owner_id" = $${bindings.length} )`)
  } else if (userType === 'public') {
    // Non logged in users only see results older than 48 hours
    addWhere('"listing_created_at" < NOW() - INTERVAL \'48 hours\'')
  }

  // Complete the query
  sql += ` ORDER BY ${orderBy}`

  return { sql, bindings }
}

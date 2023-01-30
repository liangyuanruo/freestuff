// Consolidation of authentication logic

// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
import PassportStrategy from 'passport-strategy'
import { SgidClient } from '@opengovsg/sgid-client'

// -----------------------------------------------------------------------------
// Environmental Variables & Constants
// -----------------------------------------------------------------------------
const SGID_CLIENT_ID = process.env.SGID_CLIENT_ID
const SGID_CLIENT_SECRET = process.env.SGID_CLIENT_SECRET
const SGID_PRIVATE_KEY = process.env.SGID_PRIVATE_KEY
const SGID_REDIRECT_URI = process.env.SGID_REDIRECT_URI

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------
// Passport Strategy for authenticating users using sgID
class SgidStrategy extends PassportStrategy {
  // Takes SG client params as well as a verify function
  // verify is called when the sgid authentication is complete
  // It takes the sub, sgid user data, and a `done(err, user)` callback
  // It's meant to combine with your non-sgid data to "hydrate" a full user
  // which can then be returned by the done callback
  // callback signature after getting the user data - function(sub, data, function(error, user){})
  constructor (config, verify) {
    if (config === undefined) throw new TypeError('sgID configuration must be set')
    if (verify === undefined) throw new TypeError('SgidStrategy requires verify callback')
    super()
    this.name = 'sgid'
    this.client = new SgidClient(config)
    this.verify = verify
  }

  // Overloaded method
  // When called normally redirects the user to a SGID signin page
  // When called with a `code` query param in the request
  // Tries to swap the code for an access token and user data
  // If successful it then calls verify to populate application user data
  async authenticate (req, options) {
    // For the initial call just send the user to the sgid site to authenticate
    if (req?.query?.code === undefined) {
      const { url } = this.client.authorizationUrl(
        null, // any state that needs to be sent to the callback
        ['openid'], // array of scopes requested
        null // defaults to randomly generated nonce if unspecified
      )
      this.redirect(url)
    }
    // If returning with a code, then swap the code for a user
    if (req?.query?.code !== undefined) {
      try {
        const { accessToken } = await this.client.callback(req.query.code, null)
        const { sub, data } = await this.client.userinfo(accessToken)
        this.verify(sub, data, (error, user) => {
          if (error) this.error(error)
          this.success(user)
        })
      } catch (error) {
        // TODO should handle more elegantly
        // Return to previous screen? Or go somewhere with a flash error message
        this.error(error)
      }
    }
  }
}

export default class Auth {
  #passport
  #db
  constructor (passport, db) {
    this.#passport = passport
    this.#db = db
  }

  // Helper function to retrieve the full user data given an id
  async getUser (id) {
    const selectQuery = `
      SELECT * 
      FROM account
      WHERE account_id = $1
    `
    const results = await this.#db.query(selectQuery, [id])
    if (results.rows[0] === undefined) return null
    const user = {
      id: results.rows[0].account_id,
      charity: results.rows[0].account_charity,
      createdAt: results.rows[0].account_created_at
    }
    return user
  }

  init () {
    // Authentication check
    this.#passport.use(new SgidStrategy({
      clientId: SGID_CLIENT_ID,
      clientSecret: SGID_CLIENT_SECRET,
      privateKey: SGID_PRIVATE_KEY,
      redirectUri: SGID_REDIRECT_URI
    }, async (sub, data, done) => {
      const insertQuery = `
        INSERT INTO account(account_id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `
      await this.#db.query(insertQuery, [sub])
      const user = await this.getUser(sub)
      done(null, user)
    }))

    // Session serialization
    this.#passport.serializeUser((user, callback) => {
      callback(null, user.id)
    })
    this.#passport.deserializeUser(async (id, callback) => {
      const user = await this.getUser(id)
      callback(null, user)
    })
    return this
  }

  // Middleware
  authenticate (config) {
    return this.#passport.authenticate('sgid', config)
  }

  check (redirectPath) {
    return (req, res, next) => {
      if (req.isAuthenticated()) return next()
      else {
        // Store the target URL for after login completes
        // Will be cleared after use
        req.session.targetUrl = req.originalUrl
        res.redirect(redirectPath)
      }
    }
  }

  checkNot (redirectPath) {
    return (req, res, next) => {
      if (req.isAuthenticated()) {
        // Store the target URL for after login completes
        // Will be cleared after use
        req.session.targetUrl = req.originalUrl
        return res.redirect(redirectPath)
      } else next()
    }
  }
}

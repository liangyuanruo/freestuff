// Consolidation of authentication logic

// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
import bcrypt from 'bcrypt'
import PassportStrategy from 'passport-strategy'
import { SgidClient } from '@opengovsg/sgid-client'

// -----------------------------------------------------------------------------
// Environmental Variables & Constants
// -----------------------------------------------------------------------------
const SGID_CLIENT_ID = process.env.SGID_CLIENT_ID
const SGID_CLIENT_SECRET = process.env.SGID_CLIENT_SECRET
const SGID_PRIVATE_KEY = process.env.SGID_PRIVATE_KEY
const SGID_REDIRECT_URI = process.env.SGID_REDIRECT_URI

// Passport Strategy for authenticating users using sgID
class SgidStrategy extends PassportStrategy {

  // Takes SG client params as well as a verify function
  // verify is called when the sgid authentication is complete 
  // It takes the sub, sgid user data, and a `done(err, user)` callback
  // It's meant to combine with your non-sgid data to "hydrate" a full user
  // which can then be returned by the done callback
  constructor(config, verify) {
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
  async authenticate(req, options) {
    // For the initial call just send the user to the sgid site to authenticate
    if (!req.query.code) {
      const { url } = this.client.authorizationUrl(
        null, // any state that needs to be sent to the callback
        ['openid'], // or space-concatenated string
        null // defaults to randomly generated nonce if unspecified
      )
      this.redirect(url)
    }
    // If returning with a code, then swap the code for a user
    if (req.query.code) {
      const { accessToken } = await this.client.callback(req.query.code, null)
      const { sub, data } = await this.client.userinfo(accessToken)
      this.verify(sub, data, (error, user) => {
        if (error) this.error(error)
        this.success(user)
      })
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

  init () {
    // Authentication check
    this.#passport.use(new SgidStrategy({
      clientId: SGID_CLIENT_ID,
      clientSecret: SGID_CLIENT_SECRET,
      privateKey: SGID_PRIVATE_KEY,
      redirectUri: SGID_REDIRECT_URI
    }, async (sub, data, done) => {
      const insertQuery = `
        INSERT INTO account(account_name)
        VALUES ($1)
        ON CONFLICT DO NOTHING
      `
      await this.#db.query(insertQuery, [sub])
      const selectQuery = `
        SELECT * 
        FROM account
        WHERE account_name = $1
      `
      const results = await this.#db.query(selectQuery, [sub])
      console.log("finished inserting user", results)
      done(null, results.rows[0].account_name)
    }))

    // Session serialization
    this.#passport.serializeUser((user, callback) => {
      callback(null, user)
    })
    this.#passport.deserializeUser(async (id, callback) => {
      callback(null, id)
    })
    return this
  }

  // User registration
  async registerUser (name, password) {
    const hashedPassword = await bcrypt.hash(password, 10)
    const query = `
      INSERT INTO account(account_name, account_password_hash) 
      VALUES ($1, $2) 
      RETURNING *
    `
    const result = await this.#db.query(query, [name, hashedPassword])
    return result
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

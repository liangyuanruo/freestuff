// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import express from 'express'
import flash from 'express-flash'
import session from 'express-session'
import url from 'url'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

import multer from 'multer'
import multerS3 from 'multer-s3'
import morgan from 'morgan'
import passport from 'passport'
import path from 'path'
import pg from 'pg'
import redis from 'redis'
import connectRedis from 'connect-redis'
import { v4 as uuid } from 'uuid'
import waitOn from 'wait-on'
import Auth from './auth.js'
import { getListingQuery } from './listing.js'

// -----------------------------------------------------------------------------
// Environmental Variables & Constants
// -----------------------------------------------------------------------------
// Compulsory environment variables
// Using valueOf() as a hacky check if the variable is defined
const APP_PORT = process.env.APP_PORT.valueOf()
const SESSION_SECRET = process.env.SESSION_SECRET.valueOf()
const DB_HOST = process.env.DB_HOST.valueOf()
const DB_PORT = parseInt(process.env.DB_PORT.valueOf())
const DB_USER = process.env.DB_USER.valueOf()
const DB_PASSWORD = process.env.DB_PASSWORD.valueOf()
const DB_NAME = process.env.DB_NAME.valueOf()
const DB_CA = process.env.DB_CA ? process.env.DB_CA : null
const BLOB_HOST = process.env.BLOB_HOST.valueOf()
const BLOB_PORT = parseInt(process.env.BLOB_PORT.valueOf())
const BLOB_SSL = (process.env.BLOB_SSL.valueOf() === 'true')
const BLOB_BUCKET = process.env.BLOB_BUCKET.valueOf()
const BLOB_USER = process.env.BLOB_USER.valueOf()
const BLOB_PASSWORD = process.env.BLOB_PASSWORD.valueOf()
const BLOB_REGION = process.env.BLOB_REGION.valueOf()
const BLOB_PATH = process.env.BLOB_PATH.valueOf()
const CACHE_HOST = process.env.CACHE_HOST.valueOf()
const CACHE_PORT = parseInt(process.env.CACHE_PORT.valueOf())
const CACHE_PASSWORD = process.env.CACHE_PASSWORD.valueOf()
const CACHE_SSL = (process.env.CACHE_SSL.valueOf() === 'true')

// Optional environment variables
const DB_MAX_CLIENTS = parseInt(process.env.DB_MAX_CLIENTS) ?? 10
// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------
// Setup imports
dayjs.extend(relativeTime)
const RedisStore = connectRedis(session)

// Setup the database connection
console.log(`Waiting on database availability ${DB_HOST}:${DB_PORT}`)
await waitOn({ resources: [`tcp:${DB_HOST}:${DB_PORT}`] })
const db = new pg.Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: DB_CA ? { rejectUnauthorized: true, ca: DB_CA } : null,
  // number of milliseconds to wait before timing out when connecting a new client
  // by default this is 0 which means no timeout
  connectionTimeoutMillis: 10000,
  // maximum number of clients the pool should contain; defaults to 10 when unspecified.
  max: DB_MAX_CLIENTS
})

console.log(`Database available at ${DB_HOST}:${DB_PORT}`)

// Setup blobstore connection
console.log(`Waiting on blobstore availability ${BLOB_HOST}:${BLOB_PORT}`)
await waitOn({ resources: [`tcp:${BLOB_HOST}:${BLOB_PORT}`] })
const s3Client = new S3Client({
  endpoint: (BLOB_SSL ? `https://${BLOB_HOST}:${BLOB_PORT}` : `http://${BLOB_HOST}:${BLOB_PORT}`),
  forcePathStyle: true,
  region: BLOB_REGION,
  sslEnabled: BLOB_SSL,
  credentials: {
    accessKeyId: BLOB_USER,
    secretAccessKey: BLOB_PASSWORD
  }
})
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BLOB_BUCKET,
    acl: 'public-read',
    // metadata: function (req, file, cb) {
    //   cb(null, {fieldName: file.fieldname});
    // },
    key: function (req, file, cb) {
      cb(null, uuid())
    }
  })
})
console.log(`Blobstore available at ${BLOB_HOST}:${BLOB_PORT}`)

// Setup cache connection
console.log(`Waiting on cache availability ${CACHE_HOST}:${CACHE_PORT}`)
await waitOn({ resources: [`tcp:${CACHE_HOST}:${CACHE_PORT}`] })
const redisClient = redis.createClient({
  legacyMode: true,
  url: CACHE_SSL
    ? `rediss://default:${CACHE_PASSWORD}@${CACHE_HOST}:${CACHE_PORT}`
    : `redis://default:${CACHE_PASSWORD}@${CACHE_HOST}:${CACHE_PORT}`
})
redisClient.on('error', (error) => { console.error(error) })
await redisClient.connect()
console.log(`Cache available ${CACHE_HOST}:${CACHE_PORT}`)

// Setup the main application stack
console.log('Initializing app server')
const app = express()
// Find the path to the staic file folder
const serverPath = path.dirname(url.fileURLToPath(import.meta.url))
const viewPath = path.join(serverPath, 'views')
const publicPath = path.join(serverPath, 'public')
// Configure middleware
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.set('view engine', 'pug')
app.set('views', viewPath)

// Helpers
const auth = new Auth(passport, db).init()

// -----------------------------------------------------------------------------
// Web Server
// -----------------------------------------------------------------------------
console.log('Configuring public routes')

app.use(express.static(publicPath))

app.get('/', auth.target(), async (req, res, next) => {
  try {
    // search query parameters
    const {
      s: searchTerm = '',
      c: searchCategory = '',
      l: searchLocation = '',
    } = req.query

    let sql
    let bindings

    // Charity users
    if (req.user?.charity) {
      ;({ sql, bindings } = getListingQuery('charity', { searchTerm, searchCategory, searchLocation }))
    }
    // Logged in users
    else if (req.user?.id) {
      ;({ sql, bindings } = getListingQuery('auth', { userId: req.user?.id, searchTerm, searchCategory, searchLocation }))
    // Non logged in users
    } else {
      ;({ sql, bindings } = getListingQuery('public', { searchTerm, searchCategory, searchLocation }))
    }

    // execute query
    const { rows } = await db.query(sql, bindings)
    const listings = rows.map(row => {
      return {
        id: row.listing_id,
        category: row.listing_category,
        description: row.listing_description,
        timestamp: dayjs(row.listing_created_at).fromNow(),
        location: row.listing_location,
        imageURL: `${BLOB_PATH}${row.listing_image_key}`
      }
    })
    return res.render('index', { listings, user: req.user })
  } catch (error) {
    next(error)
  }
})

app.get('/account', auth.check(), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT listing_id, listing_description, listing_location, listing_created_at, listing_image_key
      FROM listing
      WHERE (listing_owner_id = $1)
      ORDER BY listing_created_at DESC
    `, [req.user.id])
    const listings = result.rows.map(row => {
      return {
        id: row.listing_id,
        description: row.listing_description,
        location: row.listing_location,
        timestamp: dayjs(row.listing_created_at).fromNow(),
        imageURL: `${BLOB_PATH}${row.listing_image_key}`
      }
    })
    res.render('account', { listings, user: req.user })
  } catch (error) {
    next(error)
  }
})

app.get('/listing/:listingId', auth.target(), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        listing_id,
        listing_owner_id,
        listing_description,
        listing_category,
        listing_location,
        listing_contact,
        listing_collection,
        listing_image_key,
        listing_created_at
      FROM listing JOIN account 
      ON listing_owner_id = account_id
      WHERE listing_id = $1
    `, [req.params.listingId])
    if (result.rows.length === 0) return res.sendStatus(404)
    const listing = {
      id: result.rows[0].listing_id,
      owner: result.rows[0].listing_owner_id,
      description: result.rows[0].listing_description,
      category: result.rows[0].listing_category,
      location: result.rows[0].listing_location,
      contact: result.rows[0].listing_contact,
      collection: result.rows[0].listing_collection,
      imageURL: `${BLOB_PATH}${result.rows[0].listing_image_key}`,
      timestamp: dayjs(result.rows[0].listing_created_at).fromNow(),
      charityReserved: dayjs(result.rows[0].listing_created_at).isAfter(dayjs().subtract(48, 'hour'))
    }
    res.render('listing', { user: req.user, listing })
  } catch (error) { next(error) }
})

app.get('/listing', auth.check(), async (req, res, next) => {
  try {
    res.render('listing', { user: req.user })
  } catch (error) { next(error) }
})

app.post('/listing/delete/:listingId', auth.check(), async (req, res, next) => {
  try {
    // In a single query check ownership and delete the listing
    const result = await db.query(`
      DELETE FROM listing 
      WHERE listing_id = $1
      AND listing_owner_id = $2
      RETURNING listing_image_key
    `, [req.params.listingId, req.user.id])
    if (result.rows.length === 0) throw new Error('Listing not found')
    if (result.rows.length > 1) throw new Error('Duplicate listings found')
    // Cleanup the blobstore
    // TODO figure out recovery if the request fails at this step
    const imageKey = result.rows[0].listing_image_key
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BLOB_BUCKET,
      Key: imageKey
    }))
    // TODO flash message with successful deletion
    res.redirect('/')
  } catch (error) { next(error) }
})

app.post('/listing', auth.check(), upload.single('file'), async (req, res, next) => {
  try {
    const owner = req.user.id
    const description = req.body.description
    const category = req.body.category
    const location = req.body.location
    const collection = req.body.collection
    const contact = req.body.contact
    const image = req.file?.key
    // Validate inputs. Only create a new object if all fields are set
    if (
      owner === undefined ||
      description === undefined ||
      category === undefined ||
      location === undefined ||
      collection === undefined ||
      contact === undefined ||
      image === undefined
    ) {
      res.sendStatus(422)
      return
    }
    const result = await db.query(`
      INSERT INTO listing(
        listing_owner_id,
        listing_description,
        listing_category,
        listing_location,
        listing_collection,
        listing_contact,
        listing_image_key
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING listing_id
    `, [
      owner,
      description,
      category,
      location,
      collection,
      contact,
      image
    ])
    const listingId = result.rows[0].listing_id
    res.redirect(`/listing/${listingId}`)
  } catch (error) { next(error) }
})

app.get('/signin', (req, res, next) => {
  try {
    res.render('signin', { user: req.user })
  } catch (error) { next(error) }
})

app.get('/auth', auth.authenticate())

app.post('/logout', (req, res, next) => {
  try {
    req.logout((err) => {
      if (err) return next(err)
      res.redirect('/')
    })
  } catch (error) { next(error) }
})

app.get('/about', auth.target(), async (req, res, next) => {
  try {
    res.render('about', { user: req.user })
  } catch (error) { next(error) }
})

app.get('/privacy', async (req, res, next) => {
  try {
    res.render('privacy', { user: req.user })
  } catch (error) { next(error) }
})

app.get('/terms', async (req, res, next) => {
  try {
    res.render('terms', { user: req.user })
  } catch (error) { next(error) }
})

// -----------------------------------------------------------------------------
// Deployment
// -----------------------------------------------------------------------------
app.listen(APP_PORT, () => console.log(`Server listening on port ${APP_PORT}`))

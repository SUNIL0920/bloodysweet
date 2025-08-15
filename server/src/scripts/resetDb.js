import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function dropIfExists(db, name) {
  const existing = await db.listCollections({ name }).toArray()
  if (existing.length > 0) {
    await db.collection(name).drop()
    console.log(`Dropped collection: ${name}`)
  } else {
    console.log(`Collection not found (skip): ${name}`)
  }
}

async function run() {
  try {
    const uri = process.env.MONGO_URI
    if (!uri) throw new Error('MONGO_URI not set')
    const finalUri = uri.endsWith('/') ? `${uri}blood_alert_mvp?retryWrites=true&w=majority` : uri
    await mongoose.connect(finalUri)
    const db = mongoose.connection.db

    // Optional hard drop: node src/scripts/resetDb.js --hard
    if (process.argv.includes('--hard')) {
      await db.dropDatabase()
      console.log('Dropped entire database')
    } else {
      // Collections used by this app
      const names = ['users', 'bloodrequests', 'pledges']
      for (const n of names) {
        // eslint-disable-next-line no-await-in-loop
        await dropIfExists(db, n)
      }
    }

    console.log('Reset complete.')
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Reset failed:', err?.message)
    process.exit(1)
  }
}

run()



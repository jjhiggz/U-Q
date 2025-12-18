import { config } from 'dotenv'
config() // Load .env first

import { faker } from '@faker-js/faker'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { songs } from '../src/db/schema'

const SONG_COUNT = 100

async function seed() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  console.log(`🌱 Seeding ${SONG_COUNT} songs...`)

  // Clear existing songs
  await db.delete(songs)
  console.log('✓ Cleared existing songs')

  // Generate fake songs
  const fakeSongs = Array.from({ length: SONG_COUNT }, () => ({
    title: faker.music.songName(),
    artist: faker.music.artist(),
    status: 'pending' as const,
    points: faker.number.int({ min: 1, max: 15 }), // Random points 1-15
    submittedAt: faker.date.recent({ days: 7 }),
  }))

  // Insert in batches
  const batchSize = 25
  for (let i = 0; i < fakeSongs.length; i += batchSize) {
    const batch = fakeSongs.slice(i, i + batchSize)
    await db.insert(songs).values(batch)
    console.log(`✓ Inserted songs ${i + 1} - ${Math.min(i + batchSize, fakeSongs.length)}`)
  }

  console.log(`\n🎵 Successfully seeded ${SONG_COUNT} songs!`)
  
  await pool.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})

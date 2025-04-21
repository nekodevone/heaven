import 'dotenv/config'
import { start } from './app'

async function run() {
  await start()
}

run()
  .then(() => {
    console.log('Done')
  })
  .catch((error) => {
    console.error('Fatal error:', error)
  })
  .finally(() => {
    // no-op
  })

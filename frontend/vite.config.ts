import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

function saveLayoutPlugin() {
  return {
    name: 'save-layout',
    configureServer(server: any) {
      server.middlewares.use('/save-layout', (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        let body = ''
        req.on('data', (chunk: any) => { body += chunk })
        req.on('end', () => {
          try {
            const { sceneId, positions } = JSON.parse(body)
            const filePath = path.resolve(process.cwd(), 'src/data/positions.json')
            const current = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            current[sceneId] = { ...(current[sceneId] ?? {}), ...positions }
            fs.writeFileSync(filePath, JSON.stringify(current, null, 2))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), saveLayoutPlugin()],
})

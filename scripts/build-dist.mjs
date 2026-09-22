import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const rootDir = resolve(import.meta.dirname, '..')
const outputDir = resolve(rootDir, 'dist')
const temporaryOutputDir = resolve(rootDir, '.dist-tmp')
const dockerArgs = [
  'buildx',
  'build',
  '--platform',
  'linux/amd64',
  '--build-arg',
  'HTTP_PROXY=http://host.docker.internal:7890',
  '--build-arg',
  'HTTPS_PROXY=http://host.docker.internal:7890',
  '--output',
  `type=local,dest=${temporaryOutputDir}`,
  '--file',
  'deploy/Dockerfile.dist',
  '.',
]

if (existsSync(temporaryOutputDir)) {
  rmSync(temporaryOutputDir, { recursive: true, force: true })
}

const build = spawnSync('docker', dockerArgs, {
  cwd: rootDir,
  stdio: 'inherit',
})

if (build.status !== 0) {
  process.exit(build.status ?? 1)
}

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true })
}

const move = spawnSync('mv', [temporaryOutputDir, outputDir], {
  stdio: 'inherit',
})

if (move.status !== 0) {
  process.exit(move.status ?? 1)
}

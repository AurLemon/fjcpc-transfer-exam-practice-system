import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const services = [
  {
    name: 'backend',
    command: new URL('../backend/node_modules/.bin/nest', import.meta.url),
    args: ['start', '--watch'],
    cwd: new URL('../backend', import.meta.url),
  },
  {
    name: 'frontend',
    command: new URL('../frontend/node_modules/.bin/vite', import.meta.url),
    args: [],
    cwd: new URL('../frontend', import.meta.url),
  },
].map((service) => ({
  ...service,
  command: fileURLToPath(service.command),
  cwd: fileURLToPath(service.cwd),
  child: null,
  hasExited: false,
  flushOutput: () => {},
}))

let isStopping = false
let exitCode = 0

const runningServices = () =>
  services.filter((service) => service.child && !service.hasExited)

const stopService = (service, signal) => {
  if (!service.child || service.hasExited) {
    return
  }

  try {
    if (process.platform === 'win32') {
      service.child.kill(signal)
      return
    }

    process.kill(-service.child.pid, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') {
      throw error
    }
  }
}

const finishWhenStopped = () => {
  if (runningServices().length === 0) {
    process.exit(exitCode)
  }
}

const createPrefixedOutput = (service, output) => {
  let buffer = ''
  const prefix = `\u001B[36m[${service.name}]\u001B[0m `

  const writeLine = (line) => {
    output.write(line === '' ? '\n' : `${prefix}${line}\n`)
  }

  return {
    write(chunk) {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop()

      for (const line of lines) {
        writeLine(line)
      }
    },
    flush() {
      if (buffer) {
        writeLine(buffer)
      }
    },
  }
}

const stopAll = (signal, nextExitCode) => {
  if (isStopping) {
    return
  }

  isStopping = true
  exitCode = nextExitCode
  console.log(`\nStopping development services (${signal})...`)

  for (const service of runningServices()) {
    stopService(service, signal)
  }

  const forceStopTimer = setTimeout(() => {
    for (const service of runningServices()) {
      stopService(service, 'SIGKILL')
    }
  }, 5000)
  forceStopTimer.unref()

  finishWhenStopped()
}

for (const service of services) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    detached: process.platform !== 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  service.child = child

  const stdout = createPrefixedOutput(service, process.stdout)
  const stderr = createPrefixedOutput(service, process.stderr)
  service.flushOutput = () => {
    stdout.flush()
    stderr.flush()
  }
  child.stdout.on('data', (chunk) => stdout.write(chunk))
  child.stderr.on('data', (chunk) => stderr.write(chunk))

  child.on('error', (error) => {
    service.hasExited = true
    console.error(`${service.name} failed to start: ${error.message}`)
    stopAll('SIGTERM', 1)
  })

  child.on('exit', (code, signal) => {
    service.hasExited = true
    service.flushOutput()

    if (!isStopping) {
      const reason = signal || `exit code ${code ?? 1}`
      console.error(`${service.name} exited: ${reason}`)
      stopAll('SIGTERM', code === 0 ? 0 : 1)
      return
    }

    finishWhenStopped()
  })
}

process.on('SIGINT', () => stopAll('SIGINT', 0))
process.on('SIGTERM', () => stopAll('SIGTERM', 0))

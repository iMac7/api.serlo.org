import { spawnSync } from 'node:child_process'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const root = path.join(__dirname, '..')

void run()

function run() {
  buildDockerImage({
    name: 'api-server',
    Dockerfile: path.join(root, 'docker', 'server', 'Dockerfile'),
    context: '../..',
    envName: 'staging',
  })
  buildDockerImage({
    name: 'api-swr-queue-worker',
    Dockerfile: path.join(root, 'docker', 'swr-queue-worker', 'Dockerfile'),
    context: '../..',
    envName: 'staging',
  })
}

function buildDockerImage({
  name,
  Dockerfile,
  context,
  envName,
}: DockerImageOptions) {
  const remoteName = `eu.gcr.io/serlo-shared/${name}`
  const date = new Date()
  const timestamp = `${date.toISOString().split('T')[0]}-${date.getTime()}`

  const { stdout: gitHashBuffer } = spawnSync('git', [
    'rev-parse',
    '--short',
    'HEAD',
  ])

  const remoteTags = toTags(remoteName, [
    envName,
    timestamp,
    gitHashBuffer.toString().split('\n')[0],
  ])
  const tags = [...remoteTags, ...toTags(name, [envName])]

  spawnSync(
    'docker',
    ['build', '-f', Dockerfile, ...tags.flatMap((tag) => ['-t', tag]), context],
    { stdio: 'inherit' },
  )

  remoteTags.forEach((remoteTag) => {
    // eslint-disable-next-line no-console
    console.log('Pushing', remoteTag)
    spawnSync('docker', ['push', remoteTag], { stdio: 'inherit' })
  })
}

function toTags(name: string, versions: string[]) {
  return versions.map((version) => `${name}:${version}`)
}

interface DockerImageOptions {
  name: string
  Dockerfile: string
  context: string
  envName: 'staging' | 'production'
}

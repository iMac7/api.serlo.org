/**
 * This file is part of Serlo.org API
 *
 * Copyright (c) 2020-2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2020-2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/api.serlo.org for the canonical source repository
 */
import * as Sentry from '@sentry/node'
import { rest } from 'msw'
import { SharedOptions } from 'msw/lib/types/sharedOptions'
import { setupServer } from 'msw/node'

import {
  defaultSpreadsheetApi,
  givenSpreadheetApi,
} from '../__tests__/__utils__'
import { createCache } from '~/internals/cache'
import { initializeSentry } from '~/internals/sentry'
import { Time, timeToMilliseconds } from '~/internals/swr-queue'
import { Timer } from '~/internals/timer'

export class MockTimer implements Timer {
  private currentTime = 0

  public now() {
    return this.currentTime
  }

  public flush() {
    this.currentTime = Date.now()
  }

  // We make this synchronous function asynchronous just to make clear that this would be asynchronous in production.
  // eslint-disable-next-line @typescript-eslint/require-await
  public async waitFor(time: Time) {
    this.currentTime += timeToMilliseconds(time)
  }
}

export function setup() {
  initializeSentry({
    dsn: 'https://public@127.0.0.1/0',
    environment: 'testing',
    context: 'testing',
  })

  const timer = new MockTimer()
  const cache = createCache({ timer })
  const server = setupServer()

  global.cache = cache
  global.server = server
  global.timer = timer
}

export async function createBeforeAll(options: SharedOptions) {
  await global.cache.ready()

  global.server.listen(options)
}

export async function createBeforeEach() {
  givenSpreadheetApi(defaultSpreadsheetApi())

  // Mock store endpoint of sentry ( https://develop.sentry.dev/sdk/store/ )
  global.server.use(
    rest.post<Sentry.Event>(
      'https://127.0.0.1/api/0/store/',
      (req, res, ctx) => {
        global.sentryEvents.push(req.body)

        return res(ctx.status(200))
      }
    )
  )

  await global.cache.flush()
  global.timer.flush()
  global.sentryEvents = []
}

export function createAfterEach() {
  global.server.resetHandlers()
}

export async function createAfterAll() {
  global.server.close()
  await global.cache.quit()
  // redis.quit() creates a thread to close the connection.
  // We wait until all threads have been run once to ensure the connection closes.
  await new Promise((resolve) => setImmediate(resolve))
}

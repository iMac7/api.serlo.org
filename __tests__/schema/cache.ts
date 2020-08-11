/**
 * This file is part of Serlo.org API
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/api.serlo.org for the canonical source repository
 */

import { isNone, isSome } from 'fp-ts/lib/Option'
import { rest } from 'msw'

import {
  createCacheKeysQuery,
  createRemoveCacheMutation,
  createSetCacheMutation,
  variables,
  createUpdateCacheMutation,
} from '../../__fixtures__'
import { MajorDimension } from '../../src/graphql/data-sources/google-spreadsheet-api'
import { Service } from '../../src/graphql/schema/types'
import {
  assertFailingGraphQLMutation,
  assertSuccessfulGraphQLMutation,
  assertSuccessfulGraphQLQuery,
  createTestClient,
  createSpreadsheetHandler,
} from '../__utils__'

const mockSpreadSheetData = {
  spreadsheetId: '1qpyC0XzvTcKT6EISywvqESX3A0MwQoFDE8p_Bll4hps',
  range: 'sheet1!A:A',
  majorDimension: MajorDimension.Columns,
  apiKey: 'very-secure-secret',
  body: {
    values: [['1', '2']],
    majorDimension: MajorDimension.Columns,
    range: 'sheet1!A:A',
  },
}

beforeEach(() => {
  global.server.use(
    rest.get(
      `http://de.${process.env.SERLO_ORG_HOST}/api/cache-keys`,
      (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(['foo', 'bar', 'boo']))
      }
    ),
    rest.get(
      `http://de.${process.env.SERLO_ORG_HOST}/api/foo`,
      (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(['bla']))
      }
    ),
    rest.get(
      `http://en.${process.env.SERLO_ORG_HOST}/api/bar`,
      (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(['ble']))
      }
    ),
    createSpreadsheetHandler(mockSpreadSheetData)
  )
})

test('_cacheKeys', async () => {
  const { client } = createTestClient({
    service: Service.Serlo,
    user: null,
  })
  await assertSuccessfulGraphQLQuery({
    ...createCacheKeysQuery(),
    data: {
      _cacheKeys: {
        nodes: ['foo', 'bar', 'boo'],
        totalCount: 3,
      },
    },
    client,
  })
})

test('_setCache (forbidden)', async () => {
  const { client } = createTestClient({
    service: Service.SerloCloudflareWorker,
    user: null,
  })

  await assertFailingGraphQLMutation(
    {
      ...createSetCacheMutation(variables),
      client,
    },
    (errors) => {
      expect(errors[0].extensions?.code).toEqual('FORBIDDEN')
    }
  )
})

test('_setCache (authenticated)', async () => {
  const { client, cache } = createTestClient({
    service: Service.Serlo,
    user: null,
  })

  await assertSuccessfulGraphQLMutation({
    ...createSetCacheMutation(variables),
    client,
  })

  const cachedValue = await cache.get(variables.key)
  expect(isSome(cachedValue) && cachedValue.value).toEqual(variables.value)
})

test('_removeCache (forbidden)', async () => {
  const { client } = createTestClient({
    service: Service.SerloCloudflareWorker,
    user: null,
  })
  await assertFailingGraphQLMutation(
    {
      ...createRemoveCacheMutation(variables),
      client,
    },
    (errors) => {
      expect(errors[0].extensions?.code).toEqual('FORBIDDEN')
    }
  )
})

test('_removeCache (authenticated)', async () => {
  const { client, cache } = createTestClient({
    service: Service.Serlo,
    user: null,
  })

  await assertSuccessfulGraphQLMutation({
    ...createRemoveCacheMutation(variables),
    client,
  })

  const cachedValue = await cache.get(variables.key)
  expect(isNone(cachedValue)).toBe(true)
})

test('_updateCache (forbidden)', async () => {
  const { client } = createTestClient({
    service: Service.SerloCloudflareWorker,
    user: null,
  })
  await assertFailingGraphQLMutation(
    {
      ...createUpdateCacheMutation(['I', 'will', 'fail']),
      client,
    },
    (errors) => {
      expect(errors[0].extensions?.code).toEqual('FORBIDDEN')
    }
  )
})

test('_updateCache *serlo.org* (authenticated)', async () => {
  const { client, cache } = createTestClient({
    service: Service.Serlo,
    user: null,
  })

  const keys = ['de.serlo.org/api/foo', 'en.serlo.org/api/bar']

  const cachedValueBeforeUpdate1 = await cache.get(keys[0])
  const cachedValueBeforeUpdate2 = await cache.get(keys[1])

  await assertSuccessfulGraphQLMutation({
    ...createUpdateCacheMutation(keys),
    client,
  })
  const cachedValueAfterUpdate1 = await cache.get(keys[0])
  expect(cachedValueBeforeUpdate1).not.toEqual(cachedValueAfterUpdate1)
  const cachedValueAfterUpdate2 = await cache.get(keys[1])
  expect(cachedValueBeforeUpdate2).not.toEqual(cachedValueAfterUpdate2)
})

test('_updateCache spreadsheet-* (authenticated)', async () => {
  const { client, cache } = createTestClient({
    service: Service.Serlo,
    user: null,
  })

  const keys = [
    'spreadsheet-1qpyC0XzvTcKT6EISywvqESX3A0MwQoFDE8p_Bll4hps-sheet1!A:A-COLUMNS',
  ]

  const cachedValueBeforeUpdate = await cache.get(keys[0])

  await assertSuccessfulGraphQLMutation({
    ...createUpdateCacheMutation(keys),
    client,
  })
  const cachedValueAfterUpdate = await cache.get(keys[0])
  expect(cachedValueBeforeUpdate).not.toEqual(cachedValueAfterUpdate)
})

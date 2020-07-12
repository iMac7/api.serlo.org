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
import {
  variables,
  createSetCacheMutation,
  createRemoveCacheMutation,
} from '../../__fixtures__/cache'
import { Service } from '../../src/graphql/schema/types'
import {
  assertSuccessfulGraphQLMutation,
  assertFailingGraphQLMutation,
} from '../__utils__/assertions'
import { createTestClient } from '../__utils__/test-client'

test('_setCache (forbidden)', async () => {
  const { client } = createTestClient({
    service: Service.Playground,
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
  const { client, cache, serializer } = createTestClient({
    service: Service.Serlo,
    user: null,
  })

  await assertSuccessfulGraphQLMutation({
    ...createSetCacheMutation(variables),
    client,
  })

  const serializedCachedValue = await cache.get(variables.key)
  const cachedValue = await serializer.deserialize(serializedCachedValue!)
  expect(cachedValue).toEqual(variables.value)
})

test('_removeCache (forbidden)', async () => {
  const { client } = createTestClient({
    service: Service.Playground,
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
  const { client, cache, serializer } = createTestClient({
    service: Service.Serlo,
    user: null,
  })

  await assertSuccessfulGraphQLMutation({
    ...createRemoveCacheMutation(variables),
    client,
  })

  const serializedCachedValue = await cache.get(variables.key)
  const cachedValue = await serializer.deserialize(serializedCachedValue!)
  expect(cachedValue).toEqual(null)
})

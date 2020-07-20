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
import { gql } from 'apollo-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

import {
  createSetNotificationStateMutation,
  notifications,
} from '../../__fixtures__/notification'
import { user } from '../../__fixtures__/uuid'
import { Service } from '../../src/graphql/schema/types'
import {
  assertFailingGraphQLMutation,
  assertSuccessfulGraphQLMutation,
  assertSuccessfulGraphQLQuery,
} from '../__utils__/assertions'
import { createTestClient } from '../__utils__/test-client'

describe('notifications', () => {
  const server = setupServer(
    rest.get(
      `http://de.${process.env.SERLO_ORG_HOST}/api/notifications/${user.id}`,
      (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            userId: user.id,
            notifications: [
              {
                id: 3,
                unread: true,
                eventId: 3,
              },
              {
                id: 2,
                unread: false,
                eventId: 2,
              },
              {
                id: 1,
                unread: false,
                eventId: 1,
              },
            ],
          })
        )
      }
    )
  )

  function createNotificationsQuery(unread?: boolean) {
    return {
      query: gql`
        query notifications($unread: Boolean) {
          notifications(unread: $unread) {
            totalCount
            nodes {
              id
              unread
            }
          }
        }
      `,
      variables: {
        unread,
      },
    }
  }

  beforeAll(() => {
    server.listen()
  })

  afterAll(() => {
    server.close()
  })

  test('notifications without filter', async () => {
    const { client } = createTestClient({
      service: Service.Playground,
      user: 1,
    })
    await assertSuccessfulGraphQLQuery({
      ...createNotificationsQuery(),
      data: {
        notifications: {
          totalCount: 3,
          nodes: [
            {
              id: 3,
              unread: true,
            },
            {
              id: 2,
              unread: false,
            },
            {
              id: 1,
              unread: false,
            },
          ],
        },
      },
      client,
    })
  })

  test('notifications (only unread)', async () => {
    const { client } = createTestClient({
      service: Service.Playground,
      user: 1,
    })
    await assertSuccessfulGraphQLQuery({
      ...createNotificationsQuery(false),
      data: {
        notifications: {
          totalCount: 2,
          nodes: [
            {
              id: 2,
              unread: false,
            },
            {
              id: 1,
              unread: false,
            },
          ],
        },
      },
      client,
    })
  })

  test('notifications (only read)', async () => {
    const { client } = createTestClient({
      service: Service.Playground,
      user: 1,
    })
    await assertSuccessfulGraphQLQuery({
      ...createNotificationsQuery(true),
      data: {
        notifications: {
          totalCount: 1,
          nodes: [
            {
              id: 3,
              unread: true,
            },
          ],
        },
      },
      client,
    })
  })
})

describe('setNotificationState', () => {
  test('unauthenticated', async () => {
    const { client } = createTestClient({
      service: Service.Playground,
      user: null,
    })
    await assertFailingGraphQLMutation(
      {
        ...createSetNotificationStateMutation({ id: 1, unread: false }),
        client,
      },
      (errors) => {
        expect(errors[0].extensions?.code).toEqual('UNAUTHENTICATED')
      }
    )
  })

  test('wrong user id', async () => {
    const server = setupServer(
      rest.post(
        `http://de.${process.env.SERLO_ORG_HOST}/api/set-notification-state/1`,
        (req, res, ctx) => {
          return res(ctx.status(403), ctx.json({}))
        }
      )
    )
    server.listen()
    const { client } = createTestClient({
      service: Service.Playground,
      user: 1,
    })
    await assertFailingGraphQLMutation(
      {
        ...createSetNotificationStateMutation({ id: 1, unread: false }),
        client,
      },
      (errors) => {
        expect(errors[0].extensions?.code).toEqual('FORBIDDEN')
      }
    )
    server.close()
  })

  test('authenticated', async () => {
    const server = setupServer(
      rest.get(
        `http://de.${process.env.SERLO_ORG_HOST}/api/notifications/${notifications.userId}`,
        (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(notifications))
        }
      ),
      rest.post(
        `http://de.${process.env.SERLO_ORG_HOST}/api/set-notification-state/${notifications.notifications[0].id}`,
        (req, res, ctx) => {
          return res(ctx.status(200), ctx.json({}))
        }
      )
    )
    server.listen()
    const { client } = createTestClient({
      service: Service.Serlo,
      user: notifications.userId,
    })
    await assertSuccessfulGraphQLMutation({
      ...createSetNotificationStateMutation({
        id: notifications.notifications[0].id,
        unread: false,
      }),
      client,
    })
    await assertSuccessfulGraphQLQuery({
      query: gql`
        {
          notifications {
            nodes {
              id
              unread
            }
          }
        }
      `,
      data: {
        notifications: {
          nodes: [
            {
              id: 1,
              unread: false,
            },
          ],
        },
      },
      client,
    })
    server.close()
  })
})

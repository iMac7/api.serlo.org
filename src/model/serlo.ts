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
import { option as O } from 'fp-ts'
import * as t from 'io-ts'
import fetch, { Response } from 'node-fetch'
import * as R from 'ramda'

import { UuidPayloadDecoder } from './decoder'
import { Model } from './types'
import { Environment } from '~/internals/environment'
import { createHelper, createMutation, createQuery } from '~/internals/model'
import { InstanceDecoder } from '~/schema/instance/decoder'
import { isInstance } from '~/schema/instance/utils'
import {
  AbstractNotificationEventPayload,
  NotificationsPayload,
} from '~/schema/notification/types'
import { isUnsupportedNotificationEvent } from '~/schema/notification/utils'
import { SubscriptionsPayload } from '~/schema/subscription/types'
import { EntityPayload } from '~/schema/uuid/abstract-entity/types'
import {
  Navigation,
  NavigationPayload,
  NodeData,
} from '~/schema/uuid/abstract-navigation-child/types'
import {
  AbstractUuidPayload,
  DiscriminatorType,
  UuidPayload,
} from '~/schema/uuid/abstract-uuid/types'
import { isUnsupportedUuid } from '~/schema/uuid/abstract-uuid/utils'
import { decodePath, encodePath } from '~/schema/uuid/alias/utils'
import { Comment, Instance, ThreadCreateThreadInput } from '~/types'

export function createSerloModel({
  environment,
}: {
  environment: Environment
}) {
  async function handleMessageJson(args: MessagePayload) {
    const response = await handleMessage(args)
    return (await response.json()) as unknown
  }

  async function handleMessage({
    message,
    expectedStatusCodes,
  }: MessagePayload): Promise<Response> {
    const response = await fetch(
      `http://${process.env.SERLO_ORG_DATABASE_LAYER_HOST}`,
      {
        method: 'POST',
        body: JSON.stringify(message),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    if (!expectedStatusCodes.includes(response.status)) {
      throw new Error(`${response.status}: ${JSON.stringify(message)}`)
    }
    return response
  }

  interface MessagePayload {
    message: {
      type: string
      payload?: Record<string, unknown>
    }
    expectedStatusCodes: number[]
  }

  const getUuid = createQuery<{ id: number }, UuidPayload | null>(
    {
      decoder: t.union([UuidPayloadDecoder, t.null]),
      enableSwr: true,
      getCurrentValue: async ({ id }) => {
        const uuid = (await handleMessageJson({
          message: {
            type: 'UuidQuery',
            payload: {
              id,
            },
          },
          expectedStatusCodes: [200, 404],
        })) as UuidPayload | null
        return uuid === null || isUnsupportedUuid(uuid) ? null : uuid
      },
      maxAge: { hour: 1 },
      getKey: ({ id }) => {
        return `de.serlo.org/api/uuid/${id}`
      },
      getPayload: (key) => {
        if (!key.startsWith('de.serlo.org/api/uuid/')) return O.none
        const id = parseInt(key.replace('de.serlo.org/api/uuid/', ''), 10)
        return O.some({ id })
      },
    },
    environment
  )

  async function getUuidWithCustomDecoder<S extends UuidPayload>({
    id,
    decoder,
  }: {
    id: number
    decoder: t.Type<S>
  }): Promise<S | null> {
    return getUuid._querySpec.queryWithDecoders(
      { id },
      decoder,
      t.union([decoder, t.null])
    )
  }

  const setUuidState = createMutation<
    {
      ids: number[]
      userId: number
      trashed: boolean
    },
    void
  >({
    mutate: async ({ ids, userId, trashed }) => {
      await handleMessage({
        message: {
          type: 'UuidSetStateMutation',
          payload: { ids, userId, trashed },
        },
        expectedStatusCodes: [200],
      })
      await getUuid._querySpec.setCache({
        payloads: ids.map((id) => {
          return { id }
        }),
        getValue(current) {
          if (!current || current.trashed === trashed) {
            return
          }
          return { ...current, trashed }
        },
      })
    },
  })

  const getActiveAuthorIds = createQuery<undefined, number[]>(
    {
      enableSwr: true,
      getCurrentValue: async () => {
        const response = await handleMessage({
          message: {
            type: 'ActiveAuthorsQuery',
          },
          expectedStatusCodes: [200],
        })
        return (await response.json()) as number[]
      },
      maxAge: { hour: 1 },
      getKey: () => {
        return 'de.serlo.org/api/user/active-authors'
      },
      getPayload: (key: string) => {
        if (key !== 'de.serlo.org/api/user/active-authors') return O.none
        return O.some(undefined)
      },
    },
    environment
  )

  const getActiveReviewerIds = createQuery<undefined, number[]>(
    {
      enableSwr: true,
      getCurrentValue: async () => {
        const response = await handleMessage({
          message: {
            type: 'ActiveReviewersQuery',
          },
          expectedStatusCodes: [200],
        })
        return (await response.json()) as number[]
      },
      maxAge: { hour: 1 },
      getKey: () => {
        return 'de.serlo.org/api/user/active-reviewers'
      },
      getPayload: (key: string) => {
        if (key !== 'de.serlo.org/api/user/active-reviewers') return O.none
        return O.some(undefined)
      },
    },
    environment
  )
  const getNavigationPayload = createQuery<
    { instance: Instance },
    NavigationPayload
  >(
    {
      enableSwr: true,
      getCurrentValue: async ({ instance }) => {
        const response = await handleMessage({
          message: {
            type: 'NavigationQuery',
            payload: {
              instance,
            },
          },
          expectedStatusCodes: [200],
        })
        return (await response.json()) as NavigationPayload
      },
      maxAge: { hour: 1 },
      getKey: ({ instance }) => {
        return `${instance}.serlo.org/api/navigation`
      },
      getPayload: (key: string) => {
        const instance = getInstanceFromKey(key)
        return instance && key === `${instance}.serlo.org/api/navigation`
          ? O.some({ instance })
          : O.none
      },
    },
    environment
  )

  const getNavigation = createHelper<
    { instance: Instance; id: number },
    Navigation | null
  >({
    helper: async ({ instance, id }) => {
      const payload = await getNavigationPayload({ instance })
      const { data } = payload

      const leaves: Record<string, number> = {}

      const findLeaves = (node: NodeData): number[] => {
        return [
          ...(node.id ? [node.id] : []),
          ...R.flatten(R.map(findLeaves, node.children || [])),
        ]
      }

      for (let i = 0; i < data.length; i++) {
        findLeaves(data[i]).forEach((id) => {
          leaves[id] = i
        })
      }

      const treeIndex = leaves[id]

      if (treeIndex === undefined) return null

      const findPathToLeaf = (node: NodeData, leaf: number): NodeData[] => {
        if (node.id !== undefined && node.id === leaf) {
          return [node]
        }

        if (node.children === undefined) return []

        const childPaths = node.children.map((childNode) => {
          return findPathToLeaf(childNode, leaf)
        })
        const goodPaths = childPaths.filter((path) => {
          return path.length > 0
        })
        if (goodPaths.length === 0) return []
        return [node, ...goodPaths[0]]
      }

      const nodes = findPathToLeaf(data[treeIndex], id)
      const path = []

      for (let i = 0; i < nodes.length; i++) {
        const nodeData = nodes[i]
        const uuid = nodeData.id
          ? ((await getUuid({
              id: nodeData.id,
            })) as EntityPayload)
          : null
        const node = {
          label: nodeData.label,
          url: (uuid ? uuid.alias : null) || nodeData.url || null,
          id: uuid ? uuid.id : null,
        }
        path.push(node)
      }

      return {
        data: data[treeIndex],
        path,
      }
    },
  })

  const getAlias = createQuery(
    {
      decoder: t.union([
        t.type({
          id: t.number,
          instance: InstanceDecoder,
          path: t.string,
        }),
        t.null,
      ]),
      enableSwr: true,
      getCurrentValue: ({
        path,
        instance,
      }: {
        path: string
        instance: Instance
      }) => {
        return handleMessageJson({
          message: {
            type: 'AliasQuery',
            payload: { instance, path: decodePath(path) },
          },
          expectedStatusCodes: [200, 404],
        })
      },
      maxAge: { hour: 1 },
      getKey: ({ path, instance }) => {
        const cleanPath = encodePath(decodePath(path))
        return `${instance}.serlo.org/api/alias${cleanPath}`
      },
      getPayload: (key) => {
        const instance = getInstanceFromKey(key)
        const prefix = `${instance || ''}.serlo.org/api/alias`
        return instance && key.startsWith(`${prefix}/`)
          ? O.some({ instance, path: key.replace(prefix, '') })
          : O.none
      },
    },
    environment
  )

  const getLicense = createQuery(
    {
      decoder: t.type({
        id: t.number,
        instance: InstanceDecoder,
        default: t.boolean,
        title: t.string,
        url: t.string,
        content: t.string,
        agreement: t.string,
        iconHref: t.string,
      }),
      getCurrentValue: ({ id }: { id: number }) => {
        return handleMessageJson({
          message: { type: 'LicenseQuery', payload: { id } },
          expectedStatusCodes: [200, 404],
        })
      },
      enableSwr: true,
      maxAge: { day: 1 },
      getKey: ({ id }) => `de.serlo.org/api/license/${id}`,
      getPayload: (key) => {
        const prefix = 'de.serlo.org/api/license/'
        return key.startsWith(prefix)
          ? O.some({ id: parseInt(key.replace(prefix, ''), 10) })
          : O.none
      },
    },
    environment
  )

  const getNotificationEvent = createQuery<
    { id: number },
    AbstractNotificationEventPayload | null
  >(
    {
      enableSwr: true,
      getCurrentValue: async ({ id }) => {
        const response = await handleMessage({
          message: {
            type: 'EventQuery',
            payload: {
              id,
            },
          },
          expectedStatusCodes: [200, 404],
        })
        const notificationEvent = (await response.json()) as AbstractNotificationEventPayload
        return isUnsupportedNotificationEvent(notificationEvent)
          ? null
          : notificationEvent
      },
      maxAge: { day: 1 },
      getKey: ({ id }) => {
        return `de.serlo.org/api/event/${id}`
      },
      getPayload: (key) => {
        const prefix = 'de.serlo.org/api/event/'
        return key.startsWith(prefix)
          ? O.some({ id: parseInt(key.replace(prefix, ''), 10) })
          : O.none
      },
    },
    environment
  )

  const getNotifications = createQuery<
    { userId: number },
    NotificationsPayload
  >(
    {
      enableSwr: true,
      getCurrentValue: async ({ userId }) => {
        const response = await handleMessage({
          message: {
            type: 'NotificationsQuery',
            payload: {
              userId,
            },
          },
          expectedStatusCodes: [200],
        })
        return (await response.json()) as NotificationsPayload
      },
      maxAge: { hour: 1 },
      getKey: ({ userId }) => {
        return `de.serlo.org/api/notifications/${userId}`
      },
      getPayload: (key) => {
        const prefix = 'de.serlo.org/api/notifications/'
        return key.startsWith(prefix)
          ? O.some({ userId: parseInt(key.replace(prefix, ''), 10) })
          : O.none
      },
    },
    environment
  )

  const setNotificationState = createMutation<
    {
      ids: number[]
      userId: number
      unread: boolean
    },
    void
  >({
    mutate: async ({ ids, userId, unread }) => {
      await handleMessage({
        message: {
          type: 'NotificationSetStateMutation',
          payload: {
            ids,
            userId,
            unread,
          },
        },
        expectedStatusCodes: [200],
      })
      await getNotifications._querySpec.setCache({
        payload: { userId },
        getValue(current) {
          if (!current) return

          const notifications = current.notifications.map((notification) =>
            ids.includes(notification.id)
              ? { ...notification, unread }
              : notification
          )
          return { ...current, notifications }
        },
      })
    },
  })

  const getSubscriptions = createQuery<
    { userId: number },
    SubscriptionsPayload
  >(
    {
      enableSwr: true,
      getCurrentValue: async ({ userId }) => {
        const response = await handleMessage({
          message: {
            type: 'SubscriptionsQuery',
            payload: {
              userId,
            },
          },
          expectedStatusCodes: [200],
        })
        return (await response.json()) as SubscriptionsPayload
      },
      maxAge: { hour: 1 },
      getKey: ({ userId }) => {
        return `de.serlo.org/api/subscriptions/${userId}`
      },
      getPayload: (key) => {
        const prefix = 'de.serlo.org/api/subscriptions/'
        return key.startsWith(prefix)
          ? O.some({ userId: parseInt(key.replace(prefix, ''), 10) })
          : O.none
      },
    },
    environment
  )

  const setSubscription = createMutation<
    {
      ids: number[]
      userId: number
      subscribe: boolean
      sendEmail: boolean
    },
    void
  >({
    mutate: async ({ ids, userId, subscribe, sendEmail }) => {
      await handleMessage({
        message: {
          type: 'SubscriptionSetMutation',
          payload: {
            ids,
            userId,
            subscribe,
            sendEmail,
          },
        },
        expectedStatusCodes: [200],
      })
      await getSubscriptions._querySpec.setCache({
        payload: { userId },
        getValue(current) {
          if (!current) return

          // remove
          if (!subscribe) {
            return {
              ...current,
              subscriptions: current.subscriptions.filter(
                (node) => !ids.includes(node.id)
              ),
            }
          }

          //add
          const newIds = ids.filter((id) => {
            return current.subscriptions.find((sub) => sub.id !== id)
          })
          const updated = [
            ...current.subscriptions,
            ...newIds.map((id) => ({ id })),
          ].sort((a, b) => a.id - b.id)

          return {
            ...current,
            subscriptions: updated,
          }
        },
      })
    },
  })

  const getThreadIds = createQuery(
    {
      decoder: t.type({ firstCommentIds: t.array(t.number) }),
      getCurrentValue: async ({ id }: { id: number }) => {
        return handleMessageJson({
          message: { type: 'ThreadsQuery', payload: { id } },
          expectedStatusCodes: [200],
        })
      },
      enableSwr: true,
      maxAge: { hour: 1 },
      getKey: ({ id }) => {
        return `de.serlo.org/api/threads/${id}`
      },
      getPayload: (key) => {
        const prefix = 'de.serlo.org/api/threads/'
        return key.startsWith(prefix)
          ? O.some({ id: parseInt(key.replace(prefix, ''), 10) })
          : O.none
      },
    },
    environment
  )

  const createThread = createMutation<
    ThreadCreateThreadInput & { userId: number },
    // TODO: There should not be a need to import the Model type helper here
    Model<Comment> | null
  >({
    // TODO: We need a decoder here
    mutate: async (payload) => {
      const value = (await handleMessageJson({
        message: {
          type: 'ThreadCreateThreadMutation',
          payload,
        },
        expectedStatusCodes: [200],
      })) as Model<Comment> | null

      if (value !== null) {
        await getUuid._querySpec.setCache({
          payload: { id: value.id },
          value,
        })
        await getThreadIds._querySpec.setCache({
          payload: { id: payload.objectId },
          getValue(current) {
            if (!current) return
            current.firstCommentIds.unshift(value.id) //new thread on first pos
            return current
          },
        })
      }
      return value
    },
  })

  const createComment = createMutation<
    {
      content: string
      threadId: number
      userId: number
      subscribe: boolean
      sendEmail: boolean
    },
    Model<Comment> | null
  >({
    mutate: async (payload) => {
      const value = (await handleMessageJson({
        message: {
          type: 'ThreadCreateCommentMutation',
          payload,
        },
        expectedStatusCodes: [200],
      })) as Model<Comment> | null
      if (value !== null) {
        await getUuid._querySpec.setCache({
          payload: { id: value.id },
          value,
        })
        await getUuid._querySpec.setCache({
          payload: { id: payload.threadId },
          getValue(current) {
            if (!current || !isCommentPayload(current)) return
            current.childrenIds.push(value.id) // new comment on last pos in thread
            return current
          },
        })
      }
      return value
    },
  })

  const archiveThread = createMutation<
    { ids: number[]; archived: boolean; userId: number },
    void
  >({
    mutate: async (payload) => {
      await handleMessage({
        message: {
          type: 'ThreadSetThreadArchivedMutation',
          payload,
        },
        expectedStatusCodes: [200],
      })
      const { ids, archived } = payload
      await getUuid._querySpec.setCache({
        payloads: payload.ids.map((id) => {
          return { id }
        }),
        getValue(current) {
          if (!current || !isCommentPayload(current)) return
          return {
            ...current,
            archived: ids.includes(current.id) ? archived : current.archived,
          }
        },
      })
    },
  })

  const setCacheValue = createMutation<{ key: string; value: unknown }>({
    mutate: async ({ key, value }) => {
      await environment.cache.set({ key, value })
    },
  })

  const removeCacheValue = createMutation<{ key: string }>({
    mutate: async ({ key }) => {
      await environment.cache.remove({ key })
    },
  })

  return {
    createThread,
    archiveThread,
    createComment,
    getActiveAuthorIds,
    getActiveReviewerIds,
    getAlias,
    getLicense,
    getNavigationPayload,
    getNavigation,
    getNotificationEvent,
    getNotifications,
    getSubscriptions,
    setSubscription,
    getThreadIds,
    getUuid,
    getUuidWithCustomDecoder,
    setUuidState,
    removeCacheValue,
    setCacheValue,
    setNotificationState,
  }
}

function getInstanceFromKey(key: string): Instance | null {
  const instance = key.slice(0, 2)
  return key.startsWith(`${instance}.serlo.org`) && isInstance(instance)
    ? instance
    : null
}

function isCommentPayload(value: unknown): value is Model<Comment> {
  return (
    typeof value === 'object' &&
    (value as AbstractUuidPayload).__typename === DiscriminatorType.Comment
  )
}

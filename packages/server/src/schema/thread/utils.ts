/**
 * This file is part of Serlo.org API
 *
 * Copyright (c) 2020-2023 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020-2023 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/api.serlo.org for the canonical source repository
 */
import { UserInputError } from 'apollo-server'
import * as t from 'io-ts'

import { Context, Model, PickResolvers } from '~/internals/graphql'
import { CommentDecoder } from '~/model/decoder'
import { resolveConnection } from '~/schema/connection/utils'
import { isDefined } from '~/utils'

export function createThreadResolvers(): PickResolvers<'ThreadAware'> {
  return {
    async threads(parent, payload, { dataSources }) {
      const { firstCommentIds } = await dataSources.model.serlo.getThreadIds({
        id: parent.id,
      })

      return resolveConnection({
        nodes: await resolveThreads({
          ...payload,
          firstCommentIds: firstCommentIds.sort((a, b) => b - a),
          dataSources,
        }),
        payload: payload,
        createCursor(node) {
          return node.commentPayloads[0].id.toString()
        },
      })
    },
  }
}

export async function resolveThreads({
  firstCommentIds,
  archived,
  trashed,
  subjectId,
  dataSources,
}: {
  firstCommentIds: number[]
  archived?: boolean
  trashed?: boolean
  subjectId?: number | null
  dataSources: Context['dataSources']
}): Promise<Model<'Thread'>[]> {
  const firstComments = await resolveComments(dataSources, firstCommentIds)

  const firstCommentsAfterFilter = firstComments.filter((comment) => {
    if (archived !== undefined && archived !== comment.archived) {
      return false
    }
    if (trashed !== undefined && trashed !== comment.trashed) {
      return false
    }

    return true
  })

  const firstCommentsAfterSubjectFilter = await Promise.all(
    firstCommentsAfterFilter.map(async (comment) => {
      if (subjectId == null) return comment

      const entity = await dataSources.model.serlo.getUuid({
        id: comment.parentId,
      })

      return t.type({ canonicalSubjectId: t.number }).is(entity) &&
        entity.canonicalSubjectId === subjectId
        ? comment
        : null
    })
  )
  const filteredFirstComments =
    firstCommentsAfterSubjectFilter.filter(isDefined)

  return await Promise.all(
    filteredFirstComments.map(async (firstComment) => {
      const remainingComments = await resolveComments(
        dataSources,
        firstComment.childrenIds
      )
      const filteredComments = remainingComments.filter(
        (comment) => trashed === undefined || trashed === comment.trashed
      )
      return {
        __typename: 'Thread' as const,
        commentPayloads: [firstComment, ...filteredComments],
      }
    })
  )
}

export async function resolveThread(
  firstCommentId: number,
  dataSources: Context['dataSources']
): Promise<Model<'Thread'>> {
  const firstComment = await dataSources.model.serlo.getUuidWithCustomDecoder({
    id: firstCommentId,
    decoder: CommentDecoder,
  })

  const remainingComments = await resolveComments(
    dataSources,
    firstComment.childrenIds
  )

  return {
    __typename: 'Thread' as const,
    commentPayloads: [firstComment, ...remainingComments],
  }
}

export function encodeThreadId(firstCommentId: number) {
  return Buffer.from(`t${firstCommentId}`).toString('base64')
}

export function decodeThreadId(threadId: string): number {
  const result = parseInt(
    Buffer.from(threadId, 'base64').toString('utf-8').substring(1)
  )
  if (Number.isNaN(result) || result <= 0) {
    throw new UserInputError('you need to provide a valid thread id (string)')
  }
  return result
}

export function decodeThreadIds(ids: string[]): number[] {
  return ids.map(decodeThreadId)
}

async function resolveComments(
  dataSources: Context['dataSources'],
  ids: number[]
) {
  const comments = await Promise.all(
    ids.map((id) =>
      dataSources.model.serlo.getUuidWithCustomDecoder({
        id,
        decoder: t.union([CommentDecoder, t.null]),
      })
    )
  )

  return comments.filter(isDefined)
}
